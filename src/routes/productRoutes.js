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
  createProductReview,
  toggleReviewHelpful
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const upload = require('../middlewares/uploadMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for product reviews
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 review submissions per windowMs
  message: { message: 'Too many reviews created from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.route('/')
  .get(getProducts)
  .post(protect, authorize('vendor', 'admin'), upload.array('images'), createProduct);

router.get('/my-products', protect, authorize('vendor'), getVendorProducts);

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('vendor', 'admin'), upload.array('images'), updateProduct)
  .delete(protect, authorize('vendor', 'admin'), deleteProduct);

router.route('/:id/submit').put(protect, authorize('vendor'), submitProduct);

router.route('/:id/reviews').post(protect, reviewLimiter, upload.array('images', 5), createProductReview);
router.route('/:id/reviews/:reviewId/helpful').put(protect, toggleReviewHelpful);

module.exports = router;
