const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  createCODOrder,
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// @route   POST /api/payments/create-order
// @desc    Create Razorpay Order
// @access  Private
router.post('/create-order', protect, createRazorpayOrder);

// @route   POST /api/payments/verify
// @desc    Verify Razorpay Payment
// @access  Private
router.post('/verify', protect, verifyPayment);

// @route   POST /api/payments/cod
// @desc    Create COD Order
// @access  Private
router.post('/cod', protect, createCODOrder);

module.exports = router;
