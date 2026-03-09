const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, parent, image, promoImage, isFeatured, isOccasion, isPromo, isActive } = req.body;

  const categoryExists = await Category.findOne({ name });

  if (categoryExists) {
    res.status(400);
    throw new Error('Category already exists');
  }

  const category = await Category.create({
    name,
    parent: parent || null,
    image,
    promoImage,
    isFeatured,
    isOccasion,
    isPromo,
    isActive: isActive !== undefined ? isActive : true,
    slug: name.toLowerCase().replace(/ /g, '-'), // Simple slug generation
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

  category.name = req.body.name || category.name;
  category.parent = req.body.parent !== undefined ? req.body.parent : category.parent;
  category.image = req.body.image !== undefined ? req.body.image : category.image;
  category.isActive = req.body.isActive !== undefined ? req.body.isActive : category.isActive;
  category.isFeatured = req.body.isFeatured !== undefined ? req.body.isFeatured : category.isFeatured;
  category.isOccasion = req.body.isOccasion !== undefined ? req.body.isOccasion : category.isOccasion;
  category.isPromo = req.body.isPromo !== undefined ? req.body.isPromo : category.isPromo;
  category.promoImage = req.body.promoImage !== undefined ? req.body.promoImage : category.promoImage;
  category.featuredProduct = req.body.featuredProduct !== undefined ? req.body.featuredProduct : category.featuredProduct;

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
