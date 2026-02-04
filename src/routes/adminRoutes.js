const express = require('express');
const router = express.Router();
const {
  approveVendor,
  rejectVendor,
  getModerationQueue,
  approveProduct,
  rejectProduct,
  getVendors,
  createVendor,
  updateVendor,
} = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(admin);

router.get('/vendors', getVendors);
router.post('/vendors', createVendor);
router.put('/vendors/:id', updateVendor);
router.put('/vendors/:id/approve', approveVendor);
router.put('/vendors/:id/reject', rejectVendor);
router.get('/products/pending', getModerationQueue);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/reject', rejectProduct);

module.exports = router;
