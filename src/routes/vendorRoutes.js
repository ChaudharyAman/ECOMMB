const express = require('express');
const router = express.Router();
const { onboardVendor, getVendorStats } = require('../controllers/vendorController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/onboard', protect, onboardVendor);
router.get('/dashboard', protect, getVendorStats);

module.exports = router;
