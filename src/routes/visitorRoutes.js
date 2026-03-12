const express = require('express');
const router = express.Router();
const { getVisitors } = require('../controllers/visitorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/').get(protect, authorize('admin'), getVisitors);

module.exports = router;
