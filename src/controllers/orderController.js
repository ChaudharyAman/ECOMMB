const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
  const { 
    orderItems, 
    shippingAddress, 
    paymentMethod, 
    itemsPrice, 
    taxPrice, 
    shippingPrice, 
    totalPrice,
    couponCode,
    couponDiscount
  } = req.body;

  // Option 1: Create from passed items (if frontend handles logic)
  // Option 2: Create from Cart (more secure)
  // For validation, we'll try to sync with backend prices or trust frontend for MVP but verify cart matches?
  // Let's go with passed items for flexibility, but in production verify prices.

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  } else {
    const order = new Order({
      user: req.user._id,
      items: orderItems.map(item => ({
         product: item.product,
         quantity: item.quantity,
         price: item.price,
         vendor: item.vendor
      })), // Ensure structure matches schema
      shippingAddress,
      paymentInfo: {
          type: paymentMethod,
          status: 'Pending' 
      },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      couponCode,
      couponDiscount: couponDiscount || 0,
    });

    const createdOrder = await order.save();

    // If couponCode is provided, mark it as consumed by the user
    if (couponCode) {
      try {
        const { markCouponUsed } = require('./couponController');
        await markCouponUsed(couponCode, req.user._id);
      } catch (couponError) {
        console.error('Failed to mark coupon as used:', couponError);
      }
    }

    // Clear Cart
    // await Cart.findOneAndDelete({ user: req.user._id }); // Or empty items

    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name images slug')
    .populate('items.vendor', 'storeName slug logo');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Access Control
  const isOwner = order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  let isAuthorizedVendor = false;

  if (req.user.role === 'vendor') {
    const vendorProfile = await Vendor.findOne({ user: req.user._id });
    if (vendorProfile) {
      isAuthorizedVendor = order.items.some(
        (item) => item.vendor && item.vendor._id.toString() === vendorProfile._id.toString()
      );
    }
  }

  if (!isOwner && !isAdmin && !isAuthorizedVendor) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json(order);
});

// @desc    Get logged in user orders (paginated with filters)
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;

  const query = { user: req.user._id };

  // Status filter
  if (status && status !== 'All') {
    query.status = status;
  }

  // Pagination
  const currentPage = Number(page) || 1;
  const currentLimit = Number(limit) || 10;
  const skip = (currentPage - 1) * currentLimit;

  const totalOrders = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit);

  const totalPages = Math.ceil(totalOrders / currentLimit);

  res.json({
    orders,
    currentPage,
    totalPages,
    totalOrders,
  });
});

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Verify ownership/admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  // Only if status is Pending or Processing
  if (order.status !== 'Pending' && order.status !== 'Processing') {
    res.status(400);
    throw new Error('Order can only be cancelled if it is Pending or Processing');
  }

  // Set status='Cancelled', cancelReason=reason, push to statusHistory
  order.status = 'Cancelled';
  order.cancelReason = reason || 'No reason provided';
  if (!order.statusHistory) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: 'Cancelled',
    note: reason || 'Order cancelled by user',
  });
  await order.save();

  // Restore stock: Promise.all of Product.findByIdAndUpdate with $inc:{stock:+item.quantity}
  const restoreStockPromises = order.items.map((item) => {
    return Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } },
      { new: true }
    );
  });
  await Promise.all(restoreStockPromises);

  // TODO: initiate Razorpay refund if paymentInfo.type != COD
  try {
    const User = require('../models/User');
    const emailService = require('../services/emailService');

    const populatedOrder = await Order.findById(order._id).populate('items.product');
    const user = await User.findById(order.user);

    if (user && populatedOrder) {
      try {
        await emailService.sendOrderCancellation({ order: populatedOrder, user });
      } catch (cancellationEmailError) {
        console.error('Error sending order cancellation email:', cancellationEmailError);
      }
    }
  } catch (emailError) {
    console.error('Failed to execute order cancellation email operations:', emailError);
  }

  res.json(order);
});

// @desc    Request a return for delivered order
// @route   PUT /api/orders/:id/return
// @access  Private
const requestReturn = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Verify ownership
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this order');
  }

  // Only if status is Delivered
  if (order.status !== 'Delivered') {
    res.status(400);
    throw new Error('Returns can only be requested for Delivered orders');
  }

  // Set returnRequest fields
  order.returnRequest = {
    requested: true,
    reason: reason || 'No reason provided',
    status: 'pending',
    requestedAt: Date.now(),
  };

  // Push to statusHistory
  if (!order.statusHistory) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: 'Return Requested',
    note: reason || 'Return requested by user',
  });

  await order.save();

  res.json(order);
});

module.exports = {
  addOrderItems,
  getOrderById,
  getMyOrders,
  cancelOrder,
  requestReturn,
};
