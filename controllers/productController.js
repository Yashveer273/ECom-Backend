// controllers/productController.js
const Product = require("../models/Product_model");
const getUserRole = (req) => {
    // This assumes authentication middleware runs before the controller
    // and sets req.user. If no user, it's a public request.
    return req.user?.role || 'public'; 
};
// --------------------------------------
// ➤ CREATE product (admin only)
// --------------------------------------
exports.createProduct = async (req, res) => {
    try {
        const data = req.body;

        // 1️⃣ Product Name Required
        if (!data.name)
            return res.status(400).json({ success: false, message: "Product name is required" });

        // 2️⃣ Vendor ID Required
        if (!data.vendorId)
            return res.status(400).json({ success: false, message: "Vendor ID is required" });

        // 3️⃣ At least 1 variation required
        if (!Array.isArray(data.variations) || data.variations.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one variation is required"
            });
        }

        // ------------------------------------------
        // 4️⃣ Validate each variation
        // ------------------------------------------
        for (let v of data.variations) {

            // SKU check
            if (!v.sku) {
                return res.status(400).json({
                    success: false,
                    message: "SKU is required in each variation"
                });
            }

            // UNIQUE SKU CHECK
            const skuExists = await Product.findOne({ "variations.sku": v.sku });
            if (skuExists)
                return res.status(400).json({
                    success: false,
                    message: `SKU already exists: ${v.sku}`
                });

            // ------------------------
            // PRICE VALIDATION
            // ------------------------
            if (!Array.isArray(v.price) || v.price.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Each variation must have a price array with at least 1 price object"
                });
            }

            const p = v.price[0]; // ALWAYS FIRST PRICE

            if (!p.mrp) {
                return res.status(400).json({
                    success: false,
                    message: "MRP is required in variation price"
                });
            }

            if (!p.sellingPrice) {
                return res.status(400).json({
                    success: false,
                    message: "Selling price is required in variation price"
                });
            }

            if (p.sellingPrice > p.mrp) {
                return res.status(400).json({
                    success: false,
                    message: "Selling price cannot be greater than MRP"
                });
            }

            // ------------------------
            // IMAGE VALIDATION
            // ------------------------
            if (!Array.isArray(v.images) || v.images.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Each variation must contain images"
                });
            }

            const primaryImage = v.images.some(img => img.isPrimary === true);

            if (!primaryImage) {
                return res.status(400).json({
                    success: false,
                    message: "Each variation must have at least one primary image"
                });
            }

            // ------------------------
            // COLOR VALIDATION
            // ------------------------
            if (!Array.isArray(v.productColors) || v.productColors.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Each variation must have product colors"
                });
            }

          // Step 1: Collect all product colors from all variations
let allProductColors = [];

for (const v of req.body.variations) {
    if (Array.isArray(v.productColors)) {
        allProductColors.push(...v.productColors); 
    }
}

// Step 2: Check if any color is prime
const hasPrimeColor = allProductColors.some(color => color.isPrime === true);

// Step 3: Validate
if (!hasPrimeColor) {
    return res.status(400).json({
        success: false,
        message: "At least one product color must be marked as prime across all variations"
    });
}

        }

        // ------------------------------------------
        // 5️⃣ Create Product
        // ------------------------------------------
        const product = new Product(data);
        await product.save();

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (err) {
        console.log("Product creation error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// --------------------------------------
// ➤ GET ALL products with filtering, sorting, pagination
// --------------------------------------
exports.getProducts = async (req, res) => {
    try {
        const { 
            category, 
            brand, 
            minPrice, 
            maxPrice,
            search,
            sort,
            page = 1,
            limit = 20,
            // ✨ New parameter for filtering by publish status (Admin only)
            publishStatus
        } = req.query;

        let filter = {};
        const role = getUserRole(req);

        // -------------------------------
        // 1️⃣ PUBLISH STATUS / ACTIVE FILTER
        
        // Public users only see 'Published' and active products
        if (role === 'public') {
            filter.publishStatus = 'Published';
            filter.isActive = true; 
        } 
        // Admin users can see all products by default, or filter by status
        else if (role === 'admin') {
            // Allows admin to explicitly filter by status (e.g., /?publishStatus=Draft)
            if (publishStatus) {
                filter.publishStatus = publishStatus;
            }
            // If no publishStatus is provided, the admin sees all statuses.
            // Note: isActive filter is removed for admin to view inactive/archived products
        }

        // -------------------------------
        // 2️⃣ OTHER FILTERS (Apply to all roles)

        if (category) filter.category = category;
        if (brand) filter.brand = brand;
        if (minPrice || maxPrice)
            filter["price.sellingPrice"] = {
                ...(minPrice && { $gte: Number(minPrice) }),
                ...(maxPrice && { $lte: Number(maxPrice) }),
            };

        // Full text search (MongoDB text index)
        if (search) filter.$text = { $search: search };

        // -------------------------------
        // 3️⃣ SORTING & PAGINATION

        let sortOption = {};
        if (sort === "price_low") sortOption["price.sellingPrice"] = 1;
        if (sort === "price_high") sortOption["price.sellingPrice"] = -1;
        if (sort === "newest") sortOption["createdAt"] = -1;
        if (sort === "rating") sortOption["avgRating"] = -1;

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, products, total: products.length });
    } catch (err) {
        console.error("Get products error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// --------------------------------------
// ➤ GET single product by slug
// --------------------------------------
exports.getProductBySlug = async (req, res) => {
    try {
        const role = getUserRole(req);
        const slug = req.params.slug;
        
        let filter = { slug };

        // -------------------------------
        // Public access restriction
        // Public users can only see 'Published' products.
        if (role === 'public') {
            filter.publishStatus = 'Published';
            filter.isActive = true; 
        }

        const product = await Product.findOne(filter);

        if (!product)
            return res.status(404).json({ success: false, message: "Product not found" });
        
        // Admin users can see any product, but public is restricted by the filter.
        // The check is for `!product` after the find operation.

        res.json({ success: true, product });
    } catch (err) {
        console.error("Get product by slug error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// --------------------------------------
// ➤ UPDATE product (admin only)
// --------------------------------------
exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const data = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // -------------------------------
        // 1️⃣ VALIDATION: Unique Fields Check (SKU & SLUG)
        
        // Prevent updating SKU to an existing SKU belonging to a different product
        if (data.sku && data.sku !== product.sku) {
            const skuExists = await Product.findOne({ sku: data.sku, _id: { $ne: productId } });
            if (skuExists) {
                return res.status(400).json({ success: false, message: "SKU already in use by another product" });
            }
        }

        // Prevent updating SLUG to an existing SLUG belonging to a different product
        if (data.slug && data.slug !== product.slug) {
            const slugExists = await Product.findOne({ slug: data.slug, _id: { $ne: productId } });
            if (slugExists) {
                return res.status(400).json({ success: false, message: "Slug already in use by another product" });
            }
        }

        // -------------------------------
        // 2️⃣ VALIDATION: Price Check
        
        // Check sellingPrice vs mrp (handles nested object update)
        if (data.price) {
            const newMrp = data.price.mrp !== undefined ? data.price.mrp : product.price.mrp;
            const newSellingPrice = data.price.sellingPrice !== undefined ? data.price.sellingPrice : product.price.sellingPrice;

            if (newSellingPrice > newMrp) {
                return res.status(400).json({
                    success: false,
                    message: "Selling price cannot be greater than MRP"
                });
            }
        }

        // -------------------------------
        // 3️⃣ VALIDATION: Publish Status Check
        
        const validStatuses = ['Draft', 'Pending Review', 'Published', 'Archived'];
        if (data.publishStatus && !validStatuses.includes(data.publishStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid publishStatus. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        
        // -------------------------------
        // 4️⃣ UPDATE PRODUCT
        
        const updated = await Product.findByIdAndUpdate(
            productId,
            data,
            { new: true, runValidators: true } // `runValidators: true` enforces schema checks
        );

        res.json({ success: true, updated });
    } catch (err) {
        // Catch MongoDB validation errors (like missing required fields in nested objects)
        if (err.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: err.message });
        }
        console.error("Product update error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// --------------------------------------
// ➤ DELETE product
// --------------------------------------
exports.deleteProduct = async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);

        if (!deleted)
            return res.status(404).json({ success: false, message: "Product not found" });

        res.json({ success: true, message: "Product removed" });
    } catch (err) {
        console.error("Product delete error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
}; // <-- Correctly placed closing brace for deleteProduct

// --------------------------------------
// ➤ UPDATE product status (admin only)
// --------------------------------------
exports.updateProductStatus = async (req, res) => { // <-- Now correctly exported
    try {
        const productId = req.params.id;
        const { publishStatus } = req.body; // Only extract publishStatus
        const validStatuses = ['Draft', 'Pending Review', 'Published', 'Archived'];

        // 1️⃣ Validation Check
        if (!publishStatus || !validStatuses.includes(publishStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid or missing publishStatus. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // 2️⃣ Update Operation
        const updated = await Product.findByIdAndUpdate(
            productId,
            { publishStatus }, // Only update the status field
            { new: true, select: 'name publishStatus updatedAt' } // Return only relevant fields
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ 
            success: true, 
            message: `Product status updated to '${publishStatus}'`,
            updatedProduct: updated
        });
        
    } catch (err) {
        console.error("Product status update error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
// Note: No extra closing brace at the end of the file.