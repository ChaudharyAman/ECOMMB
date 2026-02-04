const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body;

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
    });

    const createdOrder = await order.save();

    // Clear Cart
    // await Cart.findOneAndDelete({ user: req.user._id }); // Or empty items

    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.product');

  if (order) {
    // Check access
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
         res.status(403);
         throw new Error('Not authorized to view this order');
    }
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

module.exports = {
  addOrderItems,
  getOrderById,
  getMyOrders,
};
