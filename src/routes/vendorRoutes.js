const express = require('express');
const router = express.Router();
const { 
  onboardVendor, 
  getVendorStats,
  getVendorBySlug,
  getVendorProducts
} = require('../controllers/vendorController');
const { protect } = require('../middlewares/authMiddleware');

// Public Storefront routes
router.get('/store/:slug', getVendorBySlug);
router.get('/store/:slug/products', getVendorProducts);

router.post('/onboard', protect, onboardVendor);
router.get('/dashboard', protect, getVendorStats);

module.exports = router;
