const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  submitProduct,
  getVendorProducts,
  createProductReview
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const upload = require('../middlewares/uploadMiddleware');

router.route('/')
  .get(getProducts)
  .post(protect, authorize('vendor', 'admin'), upload.array('images'), createProduct);

router.get('/my-products', protect, authorize('vendor'), getVendorProducts);

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('vendor', 'admin'), upload.array('images'), updateProduct)
  .delete(protect, authorize('vendor', 'admin'), deleteProduct);

router.route('/:id/submit').put(protect, authorize('vendor'), submitProduct);

router.route('/:id/reviews').post(protect, upload.single('image'), createProductReview);

module.exports = router;
