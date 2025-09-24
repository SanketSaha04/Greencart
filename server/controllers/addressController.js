// controllers/addressController.js
import Address from "../models/Address.js";

// Add Address : /api/address/add
export const addAddress = async (req, res) => {
  try {
    const addressData = req.body; // all address fields from frontend
    const userId = req.userId;     // from authUser middleware

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not Authorized" });
    }

    await Address.create({ ...addressData, userId });
    res.json({ success: true, message: "Address added successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Address : /api/address/get
export const getAddress = async (req, res) => {
  try {
    const userId = req.userId; // from authUser middleware
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not Authorized" });
    }

    const addresses = await Address.find({ userId });
    res.json({ success: true, addresses });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
