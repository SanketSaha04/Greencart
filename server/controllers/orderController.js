import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from "stripe";
import User from "../models/User.js";

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

// --- Place Order COD : /api/order/cod ---
// This function is correct.
export const placeOrderCOD = async (req, res) => {
    try {
        const { userId, items, address } = req.body;
        if (!address || items.length === 0) {
            return res.json({ success: false, message: "Invalid data" });
        }

        let amount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            amount += product.offerPrice * item.quantity;
        }
        amount += Math.floor(amount * 0.02); // Add Tax

        await Order.create({ userId, items, amount, address, paymentType: "COD" });
        return res.json({ success: true, message: "Order Placed Successfully" });
    } catch (error) {
        console.error("COD Error:", error);
        return res.json({ success: false, message: error.message });
    }
};

// --- Place Order Stripe : /api/order/stripe ---
// This function correctly creates an unpaid order before checkout.
export const placeOrderStripe = async (req, res) => {
    try {
        const { userId, items, address } = req.body;
        const { origin } = req.headers;

        if (!address || items.length === 0) {
            return res.json({ success: false, message: "Invalid data" });
        }
        
        // Create line items and calculate total amount from DB prices
        let amount = 0;
        const line_items = await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.product);
            const itemPrice = Math.floor(product.offerPrice + product.offerPrice * 0.02);
            amount += itemPrice * item.quantity;
            return {
                price_data: {
                    currency: "inr", // Note: Ensure this matches your Stripe account currency
                    product_data: { name: product.name },
                    unit_amount: itemPrice * 100, // Amount in cents
                },
                quantity: item.quantity,
            };
        }));
        
        // Create an order in the database with isPaid: false
        const order = await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "Online",
            isPaid: false, // Mark as unpaid until webhook confirmation
        });

        // Create a Stripe checkout session
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url: `${origin}/my-orders`, // Or a dedicated success page
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId,
            }
        });

        return res.json({ success: true, url: session.url });
    } catch (error) {
        console.error("Stripe Session Error:", error);
        return res.json({ success: false, message: "Error creating Stripe session" });
    }
};

// --- CORRECTED Stripe Webhook Handler ---
export const stripeWebhooks = async (request, response) => {
    const sig = request.headers["stripe-signature"];
    let event;

    try {
        // Verify the event is from Stripe
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("Stripe Webhook Error:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Handle the 'checkout.session.completed' event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object; // This is the session object
        
        const { orderId, userId } = session.metadata;

        if (!orderId) {
            return response.status(400).send('Webhook Error: Missing orderId in metadata');
        }

        try {
            // Find the order that was created before checkout
            const order = await Order.findById(orderId);
            if (order && !order.isPaid) {
                // Mark the order as paid
                order.isPaid = true;
                order.paymentId = session.payment_intent; // Store the payment intent ID
                await order.save();

                // Clear the user's cart
                await User.findByIdAndUpdate(userId, { cartItems: {} });
            }
        } catch (dbError) {
            console.error("DB update error after payment:", dbError);
            return response.status(500).send('Database error');
        }
    } else {
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    response.json({ received: true });
};

// --- Get Orders by User ID : /api/order/user ---
// Note: Changed req.body.userId to req.userId, assuming it comes from auth middleware
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.userId; // Assuming auth middleware provides this
        if (!userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        const orders = await Order.find({
            userId,
            $or: [{ paymentType: "COD" }, { isPaid: true }]
        }).populate("items.product address").sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- Get All Orders (for seller/admin) : /api/order/seller ---
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ paymentType: "COD" }, { isPaid: true }]
        }).populate("userId items.product address").sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};