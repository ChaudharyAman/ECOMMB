const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');

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

  const vendor = await Vendor.create({
    user: req.user._id,
    storeName,
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

module.exports = {
    onboardVendor,
    getVendorStats
};
