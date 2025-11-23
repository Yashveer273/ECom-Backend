// models/User.js
const mongoose = require("mongoose");

// --------------------------------------
// Reusable Address Schema
// --------------------------------------
const AddressSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    pincode: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: { type: String, default: "India" },
    isDefault: { type: Boolean, default: false }
  },
  { _id: false }
);

// --------------------------------------
// Cart Item Schema
// --------------------------------------
const CartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true }, // platform product ID
    sku: String,
    title: String,
    image: String,
    priceSnapshot: Number,
    quantity: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now },
    shippingAddress: AddressSchema
  },
  { _id: false }
);

// --------------------------------------
// Purchase Schema
// --------------------------------------
const PurchaseSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true }, // platform product ID
    purchaseId: { type: String, required: true }, // unique purchase ID
    amount: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now },

    warrantyAvailable: { type: Boolean, default: false },
    warrantyYears: { type: Number, default: 0 },
    warrantyExpiryDate: Date,

    returnPolicyDays: Number,

    claimData: {
      eligibleAfterYears: Number,
      claimEligibleDate: Date,
      claimCompleted: { type: Boolean, default: false }
    },

    shippingAddress: AddressSchema
  },
  { _id: false }
);

// --------------------------------------
// Login History
// --------------------------------------
const LoginHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    method: { type: String, enum: ["phone", "email"], default: "phone" },
    success: { type: Boolean, default: true }
  },
  { _id: false }
);

// --------------------------------------
// Main User Schema
// --------------------------------------
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },

    // ✅ Important login fields
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },

    ipAddress: { type: String },

    // ✅ latest JWT token stored only
    authToken: { type: String, index: true },

    // ✅ last login timestamp
    lastLogin: Date,

    // ✅ login activity log
    loginHistory: [LoginHistorySchema],

    // ✅ saved addresses
    savedAddresses: [AddressSchema],

    // ✅ user's active cart
    cart: [CartItemSchema],

    // ✅ past purchases
    purchases: [PurchaseSchema],

    // ✅ referral & reward points
    referralCode: String,
    referredBy: String,
    rewardPoints: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
