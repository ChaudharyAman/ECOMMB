const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');

// @desc    Fetch all products with pagination and filters
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  // Allow dynamic page size, default to 10 if not provided or invalid
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.pageNumber) || 1;

  // Build query object
  const query = { status: 'approved', isActive: true };

  // Keyword search
  if (req.query.keyword) {
    const keywords = req.query.keyword.split(/\s+/).filter(k => k.trim());
    if (keywords.length > 0) {
      query.$and = keywords.map(k => ({
        name: { $regex: k, $options: 'i' }
      }));
    }
  }

  // Category filter (including subcategories)
  if (req.query.category) {
    const Category = require('../models/Category');
    const categoryId = req.query.category;
    
    // Find all subcategories
    const subCategories = await Category.find({ parent: categoryId }).select('_id');
    const subCategoryIds = subCategories.map(c => c._id);
    
    // Query for products in the main category OR any of its subcategories
    query.category = { $in: [categoryId, ...subCategoryIds] };
  }

  // Vendor filter
  if (req.query.vendor) {
    query.vendor = req.query.vendor;
  }

  console.log('[Backend] getProducts query:', query);

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('category', 'name')
    .populate('vendor', 'storeName');

  console.log('[Backend] Found products:', products.length);

  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('vendor', 'storeName');

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Vendor/Admin
const createProduct = asyncHandler(async (req, res) => {
  // Check if user is vendor or admin
  let vendorId;
  if (req.user.role === 'admin') {
     if (!req.body.vendor) {
         res.status(400);
         throw new Error('Vendor ID required for admin creation');
     }
     vendorId = req.body.vendor;
  } else {
     const vendor = await Vendor.findOne({ user: req.user._id });
     if (!vendor) {
         res.status(404);
         throw new Error('Vendor profile not found');
     }
     vendorId = vendor._id;
  }

  let images = [];
  // Simple append if no metadata, or handle specific order if metadata exists
  if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
          url: file.path,
          public_id: file.filename
      }));
  }

  const { name, description, price, category, stock, attributes } = req.body;

  const product = new Product({
    user: req.user._id,
    vendor: vendorId,
    name,
    price,
    description,
    images,
    category,
    stock,
    countInStock: stock,
    numReviews: 0,
    slug: name.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
    attributes,
    status: 'draft',
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Vendor/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    // Check ownership if vendor
    if (req.user.role !== 'admin') {
        const vendor = await Vendor.findOne({ user: req.user._id });
        if (!vendor || product.vendor.toString() !== vendor._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this product');
        }
    }
    
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});


// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Vendor/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, description, category, stock, attributes, imageMetadata } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    if (req.user.role !== 'admin') {
        const vendor = await Vendor.findOne({ user: req.user._id });
        if (!vendor || product.vendor.toString() !== vendor._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this product');
        }

        // Restrict editing if product is submitted (pending) or approved
        if (product.status === 'pending' || product.status === 'approved') {
            res.status(400); // Bad Request
            throw new Error(`Cannot edit product while it is ${product.status}. Contact admin for changes.`);
        }
    }

    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    
    // Image Handling with Reordering
    let finalImages = [];
    
    // 1. If metadata provided, reconstruct strict order
    if (imageMetadata) {
        const metadata = JSON.parse(imageMetadata); // Expecting array of { type: 'existing'|'new', url?, public_id?, index? }
        let newFileIndex = 0;
        
        for (const item of metadata) {
            if (item.type === 'existing') {
                finalImages.push({ url: item.url, public_id: item.public_id });
            } else if (item.type === 'new') {
                if (req.files && req.files[newFileIndex]) {
                    finalImages.push({
                        url: req.files[newFileIndex].path,
                        public_id: req.files[newFileIndex].filename
                    });
                    newFileIndex++;
                }
            }
        }
    } 
    // 2. Fallback: If valid req.files but no metadata, just append (legacy behavior support)
    else if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => ({
             url: file.path,
             public_id: file.filename
        }));
        finalImages = [...product.images, ...newImages];
    } 
    // 3. If no files and no metadata, keep existing images. 
    // BUT if empty metadata [] was sent, it means delete all. 
    else if (imageMetadata && JSON.parse(imageMetadata).length === 0) {
        finalImages = [];
    }
    else {
        finalImages = product.images;
    }
    
    // Apply changes if we touched images
    if (req.files || imageMetadata) {
        product.images = finalImages;
    }

    product.category = category || product.category;
    product.stock = stock !== undefined ? stock : product.stock;
    if (req.user.role === 'admin' && req.body.isFeatured !== undefined) {
        if (req.body.isFeatured === true) {
            // Unfeature all other products
            await Product.updateMany({ _id: { $ne: product._id } }, { isFeatured: false });
        }
        product.isFeatured = req.body.isFeatured;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Submit a product for approval
// @route   PUT /api/products/:id/submit
// @access  Private/Vendor
const submitProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    if (req.user.role !== 'admin') {
         const vendor = await Vendor.findOne({ user: req.user._id });
         if (!vendor || product.vendor.toString() !== vendor._id.toString()) {
             res.status(403);
             throw new Error('Not authorized');
         }
    }

    product.status = 'pending';
    product.history.push({
        action: 'submitted',
        changedBy: req.user._id,
        note: 'Submitted for review'
    });
    
    await product.save();
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Fetch vendor's own products
// @route   GET /api/products/my-products
// @access  Private/Vendor
const getVendorProducts = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
        res.status(404);
        throw new Error('Vendor profile not found');
    }

    const products = await Product.find({ vendor: vendor._id })
        .sort({ createdAt: -1 })
        .populate('vendor', 'storeName')
        .populate('category', 'name');
    res.json(products);
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed');
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    if (req.file) {
      review.image = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    product.reviews.push(review);

    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  submitProduct,
  getVendorProducts,
  createProductReview,
};
