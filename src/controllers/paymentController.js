const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');

let razorpay;

// Helper to lazily initialize Razorpay client to prevent startup crashes when keys are missing or loaded late
const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing from the environment variables.');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400);
    throw new Error('Please provide orderId');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // 1. Find order, verify belongs to req.user._id (or allow admin override if matching other patterns)
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  // 2. Verify paymentStatus not already 'paid'
  if (order.paymentInfo && order.paymentInfo.status === 'paid') {
    res.status(400);
    throw new Error('Order is already paid');
  }

  // 3. amount = order.totalPrice * 100 (paise)
  const amount = Math.round(order.totalPrice * 100);

  // 4. razorpay.orders.create({ amount, currency:'INR', receipt: orderId.toString() })
  const rzp = getRazorpay();
  const razorpayOrder = await rzp.orders.create({
    amount,
    currency: 'INR',
    receipt: orderId.toString(),
  });

  // 5. Save new Payment doc with status 'created'
  const payment = new Payment({
    orderId,
    userId: req.user._id,
    razorpayOrderId: razorpayOrder.id,
    amount,
    currency: 'INR',
    status: 'created',
  });

  await payment.save();

  // 6. Return { razorpayOrderId, amount, currency, keyId: process.env.RAZORPAY_KEY_ID }
  res.status(201).json({
    razorpayOrderId: razorpayOrder.id,
    amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
    res.status(400);
    throw new Error('Please provide razorpayOrderId, razorpayPaymentId, razorpaySignature, and orderId');
  }

  // 1. HMAC sha256: crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(razorpayOrderId+'|'+razorpayPaymentId).digest('hex')
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const expectedSignature = shasum.digest('hex');

  // 2. Compare with crypto.timingSafeEqual
  let isAuthentic = false;
  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const signatureBuffer = Buffer.from(razorpaySignature, 'utf-8');
    if (expectedBuffer.length === signatureBuffer.length) {
      isAuthentic = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    }
  } catch (error) {
    isAuthentic = false;
  }

  // 3. On mismatch: 400 'Payment verification failed'
  if (!isAuthentic) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  // 4. On match:
  // - Update Payment: status='paid', set razorpayPaymentId + razorpaySignature
  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      status: 'paid',
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod: 'Razorpay',
    },
    { new: true }
  );

  // - Update Order: paymentInfo.status='paid', paymentInfo.id=razorpayPaymentId, status='Processing'
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!order.paymentInfo) {
    order.paymentInfo = {};
  }
  order.paymentInfo.status = 'paid';
  order.paymentInfo.id = razorpayPaymentId;
  order.paymentInfo.type = 'Online';
  order.status = 'Processing';
  await order.save();

  // - Deduct stock: Promise.all of Product.findByIdAndUpdate(id, {$inc:{stock:-qty}}) for each item
  const deductStockPromises = order.items.map((item) => {
    return Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
  });
  await Promise.all(deductStockPromises);

  // - // TODO: send email notification (Step 5)
  try {
    const User = require('../models/User');
    const emailService = require('../services/emailService');
    const populatedOrder = await Order.findById(orderId).populate('items.product');
    const user = await User.findById(order.user);

    if (user && populatedOrder) {
      try {
        await emailService.sendOrderConfirmation({ order: populatedOrder, user });
      } catch (confirmError) {
        console.error('Error sending payment order confirmation email:', confirmError);
      }

      try {
        if (payment) {
          await emailService.sendPaymentReceipt({ order: populatedOrder, payment, user });
        }
      } catch (receiptError) {
        console.error('Error sending payment receipt email:', receiptError);
      }
    }
  } catch (emailError) {
    console.error('Failed to execute payment success email operations:', emailError);
  }

  // - Return { success:true, orderId }
  res.json({ success: true, orderId });
});

// @desc    Create COD Order
// @route   POST /api/payments/cod
// @access  Private
const createCODOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400);
    throw new Error('Please provide orderId');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // 1. Verify ownership
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  // 2. Update Order: paymentInfo.status='cod_pending', paymentInfo.type='COD', status='Processing'
  if (!order.paymentInfo) {
    order.paymentInfo = {};
  }
  order.paymentInfo.status = 'cod_pending';
  order.paymentInfo.type = 'COD';
  order.status = 'Processing';
  await order.save();

  // 3. Deduct stock with Promise.all + $inc
  const deductStockPromises = order.items.map((item) => {
    return Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
  });
  await Promise.all(deductStockPromises);

  // 4. // TODO: send email notification (Step 5)
  try {
    const User = require('../models/User');
    const emailService = require('../services/emailService');

    const populatedOrder = await Order.findById(orderId).populate('items.product');
    const user = await User.findById(order.user);

    if (user && populatedOrder) {
      try {
        await emailService.sendOrderConfirmation({ order: populatedOrder, user });
      } catch (confirmError) {
        console.error('Error sending COD order confirmation email:', confirmError);
      }
    }
  } catch (emailError) {
    console.error('Failed to execute COD order email operations:', emailError);
  }

  // 5. Return { success:true, orderId }
  res.json({ success: true, orderId });
});

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  createCODOrder,
};
