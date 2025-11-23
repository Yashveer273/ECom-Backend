// routes/productRoutes.js

const express = require("express");
const router = express.Router();
const admin = require("../middleware/adminMiddleware");

const {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  updateProductStatus
} = require("../controllers/productController");

// PUBLIC ROUTES
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

// ADMIN ROUTES
router.post("/", admin, createProduct);
router.put("/:id", admin, updateProduct);
router.delete("/:id", admin, deleteProduct);
router.patch("/status/:id", admin, updateProductStatus);
module.exports = router;
