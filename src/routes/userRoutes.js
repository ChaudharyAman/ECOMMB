const express = require('express');
const router = express.Router();
const { updateUserProfile, addAddress, getAddresses, getUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.route('/').get(protect, authorize('admin'), getUsers);
router.route('/profile').put(protect, upload.single('avatar'), updateUserProfile);
router.route('/addresses').post(protect, addAddress).get(protect, getAddresses);

module.exports = router;
