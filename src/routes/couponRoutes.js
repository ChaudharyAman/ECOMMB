const express = require('express');
const router = express.Router();
const {
  applyCoupon,
  validateCoupon,
  createCoupon,
  createVendorCoupon,
  getMyCoupons,
  deactivateCoupon,
} = require('../controllers/couponController');
const { protect, authorize, admin } = require('../middlewares/authMiddleware');

// Public/Private checkout evaluation routes
router.post('/apply', protect, applyCoupon);
router.get('/validate/:code', protect, validateCoupon);

// Platform administration routes (Admin only)
router.post('/', protect, admin, createCoupon);

// Vendor-specific routes (Vendor only)
router.post('/vendor', protect, authorize('vendor'), createVendorCoupon);
router.get('/vendor/my', protect, authorize('vendor'), getMyCoupons);

// Coupon management routes (Admin or owning Vendor)
router.put('/:id/deactivate', protect, deactivateCoupon);

module.exports = router;
