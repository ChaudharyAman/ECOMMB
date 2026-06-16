const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Register new vendor or update existing profile
// @route   POST /api/vendors/onboard
// @access  Private
const onboardVendor = asyncHandler(async (req, res) => {
  const { storeName, address, bankDetails } = req.body;
  
  // Check if vendor profile exists
  const vendorExists = await Vendor.findOne({ user: req.user._id });

  if (vendorExists) {
    res.status(400);
    throw new Error('Vendor profile already exists');
  }

  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const vendor = await Vendor.create({
    user: req.user._id,
    storeName,
    slug,
    address,
    bankDetails,
    kycStatus: 'pending', // Wait for docs
  });

  if (vendor) {
    res.status(201).json(vendor);
  } else {
    res.status(400);
    throw new Error('Invalid vendor data');
  }
});

// @desc    Get Vendor Dashboard Stats
// @route   GET /api/vendors/dashboard
// @access  Private/Vendor
const getVendorStats = asyncHandler(async (req, res) => {
    // Determine vendor ID from user
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    // Aggregation to get total sales and order count
    // Note: Since Order is an order-level document, we need to match orders that contain items from this vendor
    // Then we might want to sum up ONLY the items belonging to this vendor.
    
    const stats = await Order.aggregate([
        { $match: { 'items.vendor': vendor._id } },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendor._id } },
        {
            $group: {
                _id: null,
                totalOrders: { $addToSet: '$_id' }, // Determine unique orders
                totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
        },
        {
            $project: {
                _id: 0,
                orderCount: { $size: '$totalOrders' },
                totalSales: 1
            }
        }
    ]);

    const data = stats[0] || { orderCount: 0, totalSales: 0 };

    res.json({
        balance: vendor.balance,
        kycStatus: vendor.kycStatus,
        isApproved: vendor.isApproved,
        sales: data.totalSales,
        orders: data.orderCount
    });
});

// @desc    Get public vendor store details by slug
// @route   GET /api/vendors/store/:slug
// @access  Public
const getVendorBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const vendor = await Vendor.findOne({ slug, isPublic: true, isApproved: true })
    .populate('user', 'name email')
    .select('-bankDetails -kycDocuments -kycStatus -balance -commissionRate');

  if (!vendor) {
    res.status(404);
    throw new Error('Store not found');
  }

  res.json(vendor);
});

// @desc    Get public vendor store products by slug
// @route   GET /api/vendors/store/:slug/products
// @access  Public
const getVendorProducts = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { page, limit, sort, category, minPrice, maxPrice } = req.query;

  const vendor = await Vendor.findOne({ slug, isPublic: true, isApproved: true });

  if (!vendor) {
    res.status(404);
    throw new Error('Store not found');
  }

  const query = {
    vendor: vendor._id,
    status: 'approved',
    isActive: true,
  };

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filters
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      query.price.$lte = Number(maxPrice);
    }
  }

  // Sorting
  let sortBy = { createdAt: -1 }; // default newest
  if (sort === 'price-asc') {
    sortBy = { price: 1 };
  } else if (sort === 'price-desc') {
    sortBy = { price: -1 };
  } else if (sort === 'rating') {
    sortBy = { rating: -1 };
  }

  // Pagination
  const currentPage = Number(page) || 1;
  const currentLimit = Number(limit) || 12;
  const skip = (currentPage - 1) * currentLimit;

  const totalProducts = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name')
    .populate('vendor', 'storeName slug')
    .sort(sortBy)
    .skip(skip)
    .limit(currentLimit);

  const totalPages = Math.ceil(totalProducts / currentLimit);

  res.json({
    products,
    currentPage,
    totalPages,
    totalProducts,
  });
});

module.exports = {
    onboardVendor,
    getVendorStats,
    getVendorBySlug,
    getVendorProducts,
};
