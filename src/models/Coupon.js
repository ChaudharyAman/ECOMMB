const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    minCartValue: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null, // null means platform-wide
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    perUserLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure the coupon code is saved in uppercase
couponSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Instance method to calculate the discount amount for a given cart total
couponSchema.methods.calculateDiscount = function (cartTotal) {
  if (this.type === 'percentage') {
    let discount = cartTotal * (this.value / 100);
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
    return Math.min(discount, cartTotal);
  } else if (this.type === 'flat') {
    return Math.min(this.value, cartTotal);
  }
  return 0;
};

module.exports = mongoose.model('Coupon', couponSchema);
