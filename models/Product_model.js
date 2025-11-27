const mongoose = require("mongoose");

// --------------------------------------
// Price Schema
// --------------------------------------
const PriceSchema = new mongoose.Schema(
  {
    mrp: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    currency: { type: String, default: "INR" }
  },
  { _id: false }
);

// --------------------------------------
// Image Schema
// --------------------------------------
const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: String,
    isPrimary: { type: Boolean, default: false }
  },
  { _id: false }
);



const SpecificationSchema = new mongoose.Schema(
  {
    key: String,
    value: String
  },
  { _id: false }
);
const productColors = new mongoose.Schema(
  {
    hex: String,
    isPrime: Boolean
  },
  { _id: false }
);
// --------------------------------------
// Review Schema
// --------------------------------------
const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

// --------------------------------------
// Detail Section (Story, Style Note, Details)
// --------------------------------------
const DetailSectionSchema = new mongoose.Schema(
  {
    story: String,
    details: String,
    styleNote: String
  },
  { _id: false }
);

// Product Variation (Color, Size, etc.)
// --------------------------------------
const VariationSchema = new mongoose.Schema(
  {
    PV_id: { type: mongoose.Schema.Types.ObjectId,required: true },
    color: String,
    size: String,
    stock: { type: Number, default: 0 },
    sku: { type: String, required: true },
     slug: { type: String, unique: true },
    productColors:[productColors],
    images: [ImageSchema],
      specifications: [SpecificationSchema],
       price: [PriceSchema],
 isActive: { type: Boolean, default: true },
    stock: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    productRatings: { type: Number, default: 0 },
    reviews: [ReviewSchema],
    description: DetailSectionSchema,
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    // ✅ Basic Information
    name: { type: String, required: true, index: true },
    brand: String,
    category: { type: String, index: true },
    subCategory: String,
    highlightHeading: { type: String },
    variations: [VariationSchema],

    vendorId: { type: String, required: true }, 
    vendorName: String,
    addedBy:{ type: String, required: true }, 
    vendorRating: { type: Number, default: 0 },
    publishDate: { type: Date, default: Date.now },
    publishStatus: { 
        type: String, 
        enum: ['Draft', 'Pending Review', 'Published', 'Archived'], 
        default: 'Draft',
        required: true
    },
    isSponsored: { type: Boolean, default: false },
    searchBoostScore: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    suggestedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
  
   

    warrantyYears: { type: Number, default: 0 },
    returnPolicyDays: { type: Number, default: 7 },

    // ✅ SEO & Metadata
    keywords: [String],
    tags: [String],

  
  },
  { timestamps: true }
);

// --------------------------------------
// Auto-generate slug before saving
// --------------------------------------
ProductSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// --------------------------------------
// Text index for search optimization
// --------------------------------------
ProductSchema.index({
  name: "text",
  brand: "text",
  category: "text",
  keywords: "text",
  vendorName: "text"
});

module.exports = mongoose.model("Product", ProductSchema);