import jwt from "jsonwebtoken";

const authSeller = async (req, res, next) => {
  const { sellerToken } = req.cookies;

  if (!sellerToken) {
    return res.json({ success: false, message: "Not Authorized" });
  }

  try {
    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET);

    // check if this token belongs to the allowed seller
    if (decoded.email === process.env.SELLER_EMAIL) {
      req.sellerEmail = decoded.email; // attach seller email to request
      next();
    } else {
      return res.json({ success: false, message: "Not Authorized" });
    }
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export default authSeller;
