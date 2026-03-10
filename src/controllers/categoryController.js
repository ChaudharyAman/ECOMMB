const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, parent, isFeatured, isOccasion, isPromo, isActive } = req.body;
  let { image, promoImage } = req.body;

  // Handle uploaded files from Cloudinary via middleware
  if (req.files) {
    if (req.files.imageFile && req.files.imageFile[0]) {
      image = req.files.imageFile[0].path;
    }
    if (req.files.promoImageFile && req.files.promoImageFile[0]) {
      promoImage = req.files.promoImageFile[0].path;
    }
  }

  const categoryExists = await Category.findOne({ name });

  if (categoryExists) {
    res.status(400);
    throw new Error('Category already exists');
  }

  // Robust boolean conversion for multipart/form-data
  const toBool = (val) => val === 'true' || val === true;

  const category = await Category.create({
    name,
    parent: (parent === '' || parent === 'null' || !parent) ? null : parent,
    image,
    promoImage,
    isFeatured: toBool(isFeatured),
    isOccasion: toBool(isOccasion),
    isPromo: toBool(isPromo),
    isActive: isActive !== undefined ? toBool(isActive) : true,
    slug: name.toLowerCase().replace(/ /g, '-'),
  });

  res.status(201).json(category);
});

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({})
    .populate('parent', 'name')
    .populate('featuredProduct', 'name images price');
  res.json(categories);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  // Robust boolean conversion for multipart/form-data
  const toBool = (val) => val === 'true' || val === true;

  category.name = req.body.name || category.name;
  
  if (req.body.parent !== undefined) {
    category.parent = (req.body.parent === '' || req.body.parent === 'null' || !req.body.parent) ? null : req.body.parent;
  }

  if (req.body.isActive !== undefined) category.isActive = toBool(req.body.isActive);
  if (req.body.isFeatured !== undefined) category.isFeatured = toBool(req.body.isFeatured);
  if (req.body.isOccasion !== undefined) category.isOccasion = toBool(req.body.isOccasion);
  if (req.body.isPromo !== undefined) category.isPromo = toBool(req.body.isPromo);
  
  category.featuredProduct = req.body.featuredProduct !== undefined ? req.body.featuredProduct : category.featuredProduct;

  // Handle uploaded files
  if (req.files) {
    if (req.files.imageFile && req.files.imageFile[0]) {
      category.image = req.files.imageFile[0].path;
    }
    if (req.files.promoImageFile && req.files.promoImageFile[0]) {
      category.promoImage = req.files.promoImageFile[0].path;
    }
  }

  // Fallback to URL if no file uploaded but URL provided
  if (req.body.image !== undefined && (!req.files || !req.files.imageFile)) {
    category.image = req.body.image;
  }
  if (req.body.promoImage !== undefined && (!req.files || !req.files.promoImageFile)) {
    category.promoImage = req.body.promoImage;
  }

  if (req.body.name) {
    category.slug = req.body.name.toLowerCase().replace(/ /g, '-');
  }

  const updatedCategory = await category.save();
  await updatedCategory.populate('featuredProduct', 'name images price');
  await updatedCategory.populate('parent', 'name');
  res.json(updatedCategory);
});

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
};
