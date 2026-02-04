const express = require('express');
const router = express.Router();
const { register, login, sendOTP, verifyOTP, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Email/Password Authentication
router.post('/register', register);
router.post('/login', login);

// OTP Authentication (kept for backward compatibility)
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Profile
router.get('/profile', protect, getMe);

module.exports = router;

