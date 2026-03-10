const express = require('express');
const router = express.Router();
const { createCategory, getCategories, updateCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin'), upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'promoImageFile', maxCount: 1 }]), createCategory);

router.route('/:id')
  .put(protect, authorize('admin'), upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'promoImageFile', maxCount: 1 }]), updateCategory);

module.exports = router;
