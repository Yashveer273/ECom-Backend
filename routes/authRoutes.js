const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");


// ✅ 1. Send OTP API (for register or login)
router.post("/send-otp", async (req, res) => {
  try {
    const { type, value, mode } = req.body;

    if (!type || !value || !mode) {
      return res.status(400).json({
        success: false,
        message: "type, value & mode required"
      });
    }

    // Find user
    const query = type === "phone" ? { phone: value } : { email: value };
    const user = await User.findOne(query);

    // ✅ Registration Mode
    if (mode === "register") {
      if (user) {
        return res.status(400).json({
          success: false,
          message: type === "phone"
            ? "This phone number is already registered!"
            : "This email is already registered!"
        });
      }
    }

    // ✅ Login Mode
    if (mode === "login") {
      if (!user) {
        return res.status(404).json({
          success: false,
          message: type === "phone"
            ? "This phone number is not registered!"
            : "This email is not registered!"
        });
      }
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log("OTP:", otp);

    return res.json({
      success: true,
      message: `OTP sent to ${type} ${value}`,
      otp,
      token: user ? user._id : null  // ✅ For login
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});





// ✅ 2. Registration API (after OTP verified)
router.post("/register", async (req, res) => {
  try {
    const { username, phone, email } = req.body;
    const ipAddress = req.ip;

    if (!username || !phone || !email) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // ✅ Check if user already exists
    const existing = await User.findOne({ $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // ✅ Create new user with referral code
    const newUser = new User({
      username,
      phone,
      email,
      ipAddress,
      referralCode: "RF" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      // ✅ referredBy will be set at purchase time (VERY IMPORTANT)
    });

    // ✅ Save user
    const user = await newUser.save();

    // ✅ Create JWT token
    const authToken = jwt.sign({ userId: user._id }, "111111111", {
      expiresIn: "7d",
    });

    // ✅ Save token in DB
    user.authToken = authToken;
    await user.save();

    return res.json({
      success: true,
      message: "Registration successful",
      user,
      authToken,
    });
  } catch (error) {
    console.log("Registration Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});




// ✅ 3. Login API (OTP verification done on frontend)
router.post("/login", async (req, res) => {
  const { token, value } = req.body;

  if (!token && !value)
    return res.status(400).json({ success: false, message: "token or value required" });

  const user = await User.findOne({
    _id: token,
    $or: [{ phone: value }, { email: value }]
  });

  if (!user)
    return res.status(404).json({ success: false, message: "Invalid user" });

  // ✅ Create JWT
  const authToken = jwt.sign({ userId: user._id }, "111111111", {
    expiresIn: "7d"
  });

  user.authToken = authToken;
  await user.save();

  return res.json({
    success: true,
    message: "Login successful",
    user,
    authToken
  });
});

module.exports = router;
