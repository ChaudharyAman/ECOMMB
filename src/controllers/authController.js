const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');

// @desc    Register new user with email/password
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if user already exists
  const userExists = await User.findOne({ $or: [{ email }, { phone }] });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email or phone');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'user',
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user with email/password
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Send OTP for Login/Register
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400);
    throw new Error('Please provide a phone number');
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save to DB (Update if exists or create new)
  await OTP.findOneAndUpdate(
    { phone },
    { otp },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // In production, integrate SMS API here
  console.log(`OTP for ${phone}: ${otp}`);

  // Fetch the user linked to the phone and send OTP to their email if registered
  const user = await User.findOne({ phone });
  if (user && user.email) {
    try {
      const emailService = require('../services/emailService');

      await emailService.sendOTPEmail({
        email: user.email,
        otp,
        name: user.name || 'User',
      });
    } catch (emailError) {
      console.error('Failed to send OTP verification email:', emailError);
    }
  }

  res.status(200).json({ message: 'OTP sent successfully' });
});

// @desc    Verify OTP and Login/Register
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp, name, email } = req.body; // name/email optional if existing user

  if (!phone || !otp) {
    res.status(400);
    throw new Error('Please provide phone and OTP');
  }

  const otpRecord = await OTP.findOne({ phone });

  if (!otpRecord || otpRecord.otp !== otp) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  // Check if user exists
  let user = await User.findOne({ phone });

  if (!user) {
    // Register new user
    if (!name) { // Enforce name for registration
       res.status(400);
       throw new Error('Please provide name for new registration');
    }
    user = await User.create({
      name,
      email,
      phone,
      role: 'user', // Default role
    });
  }

  // Generate Token
  const token = generateToken(user._id, user.role);

  // Delete used OTP ? Optional, but good practice.
  // await OTP.deleteOne({ phone });

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    token,
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json(user);
});

module.exports = {
  register,
  login,
  sendOTP,
  verifyOTP,
  getMe,
};
