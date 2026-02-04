const mongoose = require('mongoose');

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false, // Changed from true to allow same name in different parents
    },
    slug: {
      type: String,
      lowercase: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure name is unique ONLY within the same parent
categorySchema.index({ name: 1, parent: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
