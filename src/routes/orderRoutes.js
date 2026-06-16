const express = require('express');
const router = express.Router();
const { 
  addOrderItems, 
  getOrderById, 
  getMyOrders,
  cancelOrder,
  requestReturn
} = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
  .post(protect, addOrderItems);

router.route('/myorders').get(protect, getMyOrders);

router.route('/:id').get(protect, getOrderById);
router.route('/:id/cancel').put(protect, cancelOrder);
router.route('/:id/return').put(protect, requestReturn);

module.exports = router;
