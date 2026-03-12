const express = require('express');
const router = express.Router();
const { getVisitors, trackVisitorEndpoint } = require('../controllers/visitorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/').get(protect, authorize('admin'), getVisitors);
router.route('/track').post(trackVisitorEndpoint);

module.exports = router;
