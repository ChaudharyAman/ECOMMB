const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    images: [
      {
        public_id: String,
        url: String,
      }
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    helpful: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);
const productSchema = mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Vendor',
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'disabled', 'archived'],
      default: 'draft',
      index: true,
    },
    isActive: { // Helper for quick toggles by Vendor (only if Approved)
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    history: [
      {
        action: String, // 'submitted', 'approved', 'rejected', 'edited'
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: String,
      }
    ],
    attributes: [
      {
        key: String,
        value: String,
      },
    ],
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
