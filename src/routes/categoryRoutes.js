const express = require('express');
const router = express.Router();
const { createCategory, getCategories, updateCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin'), createCategory);

router.route('/:id')
  .put(protect, authorize('admin'), updateCategory);

module.exports = router;
