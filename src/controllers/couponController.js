const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');
const Vendor = require('../models/Vendor');

// Helper to mark coupon as used on checkout
const markCouponUsed = async (code, userId) => {
  if (!code) return null;
  const uppercaseCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: uppercaseCode });
  if (coupon) {
    coupon.usedCount += 1;
    coupon.usedBy.push(userId);
    await coupon.save();
    return coupon;
  }
  return null;
};

// @desc    Apply a coupon during checkout (validation checks only)
// @route   POST /api/coupons/apply
// @access  Private
const applyCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;

  if (!code) {
    res.status(400);
    throw new Error('Coupon code is required');
  }

  if (cartTotal === undefined || cartTotal === null || isNaN(cartTotal)) {
    res.status(400);
    throw new Error('Valid cartTotal is required');
  }

  const uppercaseCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: uppercaseCode });

  if (!coupon || !coupon.isActive) {
    res.status(400);
    throw new Error('Coupon is invalid or inactive');
  }

  // 1. Expiry Check
  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    res.status(400);
    throw new Error('Coupon has expired');
  }

  // 2. Minimum Cart Value Check
  if (cartTotal < coupon.minCartValue) {
    res.status(400);
    throw new Error(`Minimum cart value of ₹${coupon.minCartValue} is required to use this coupon`);
  }

  // 3. Overall Usage Limit Check
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error('Coupon usage limit has been reached');
  }

  // 4. Per User Limit Check
  const userUsageCount = coupon.usedBy.filter(
    (id) => id.toString() === req.user._id.toString()
  ).length;

  if (userUsageCount >= coupon.perUserLimit) {
    res.status(400);
    throw new Error('You have exceeded the usage limit for this coupon');
  }

  // Calculate discount
  const discountAmount = coupon.calculateDiscount(cartTotal);

  res.status(200).json({
    success: true,
    code: coupon.code,
    discountType: coupon.type,
    discountValue: coupon.value,
    discountAmount,
    finalTotal: Number((cartTotal - discountAmount).toFixed(2)),
  });
});

// @desc    Validate a coupon code (read-only for live UI feedback)
// @route   GET /api/coupons/validate/:code
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const cartTotal = Number(req.query.cartTotal);

  if (!code) {
    res.status(400);
    throw new Error('Coupon code is required');
  }

  if (isNaN(cartTotal)) {
    res.status(400);
    throw new Error('Valid cartTotal parameter is required');
  }

  const uppercaseCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: uppercaseCode });

  if (!coupon || !coupon.isActive) {
    res.status(400);
    throw new Error('Coupon is invalid or inactive');
  }

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    res.status(400);
    throw new Error('Coupon has expired');
  }

  if (cartTotal < coupon.minCartValue) {
    res.status(400);
    throw new Error(`Minimum cart value of ₹${coupon.minCartValue} is required to use this coupon`);
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error('Coupon usage limit has been reached');
  }

  const userUsageCount = coupon.usedBy.filter(
    (id) => id.toString() === req.user._id.toString()
  ).length;

  if (userUsageCount >= coupon.perUserLimit) {
    res.status(400);
    throw new Error('You have exceeded the usage limit for this coupon');
  }

  const discountAmount = coupon.calculateDiscount(cartTotal);

  res.status(200).json({
    success: true,
    code: coupon.code,
    discountType: coupon.type,
    discountValue: coupon.value,
    discountAmount,
    finalTotal: Number((cartTotal - discountAmount).toFixed(2)),
  });
});

// @desc    Create a platform-wide coupon (Admin only)
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    type,
    value,
    minCartValue,
    maxDiscount,
    usageLimit,
    perUserLimit,
    expiresAt,
    isActive,
  } = req.body;

  if (!code || !type || value === undefined) {
    res.status(400);
    throw new Error('Please provide coupon code, type, and value');
  }

  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (existingCoupon) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  const coupon = await Coupon.create({
    code: code.trim(),
    type,
    value,
    minCartValue: minCartValue || 0,
    maxDiscount,
    usageLimit: usageLimit !== undefined ? usageLimit : null,
    perUserLimit: perUserLimit || 1,
    expiresAt,
    isActive: isActive !== undefined ? isActive : true,
    vendor: null, // Platform-wide
    createdBy: req.user._id,
  });

  res.status(201).json(coupon);
});

// @desc    Create a vendor coupon (Vendor only)
// @route   POST /api/coupons/vendor
// @access  Private/Vendor
const createVendorCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    type,
    value,
    minCartValue,
    maxDiscount,
    usageLimit,
    perUserLimit,
    expiresAt,
    isActive,
  } = req.body;

  if (!code || !type || value === undefined) {
    res.status(400);
    throw new Error('Please provide coupon code, type, and value');
  }

  const vendorProfile = await Vendor.findOne({ user: req.user._id });
  if (!vendorProfile) {
    res.status(403);
    throw new Error('Not authorized. Vendor profile not found');
  }

  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (existingCoupon) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  const coupon = await Coupon.create({
    code: code.trim(),
    type,
    value,
    minCartValue: minCartValue || 0,
    maxDiscount,
    usageLimit: usageLimit !== undefined ? usageLimit : null,
    perUserLimit: perUserLimit || 1,
    expiresAt,
    isActive: isActive !== undefined ? isActive : true,
    vendor: vendorProfile._id,
    createdBy: req.user._id,
  });

  res.status(201).json(coupon);
});

// @desc    Get vendor coupons (Vendor only)
// @route   GET /api/coupons/vendor/my
// @access  Private/Vendor
const getMyCoupons = asyncHandler(async (req, res) => {
  const vendorProfile = await Vendor.findOne({ user: req.user._id });
  if (!vendorProfile) {
    res.status(403);
    throw new Error('Not authorized. Vendor profile not found');
  }

  const coupons = await Coupon.find({ vendor: vendorProfile._id }).sort({ createdAt: -1 });
  res.status(200).json(coupons);
});

// @desc    Deactivate a coupon (Admin or owning Vendor)
// @route   PUT /api/coupons/:id/deactivate
// @access  Private
const deactivateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  // Access control check
  if (req.user.role !== 'admin') {
    const vendorProfile = await Vendor.findOne({ user: req.user._id });
    if (!vendorProfile || !coupon.vendor || coupon.vendor.toString() !== vendorProfile._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to deactivate this coupon');
    }
  }

  coupon.isActive = false;
  await coupon.save();

  res.status(200).json({ message: 'Coupon deactivated successfully', coupon });
});

module.exports = {
  applyCoupon,
  validateCoupon,
  createCoupon,
  createVendorCoupon,
  getMyCoupons,
  deactivateCoupon,
  markCouponUsed,
};
