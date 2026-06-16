const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        vendor: { // Provide easy access to vendor for order splitting/settlement
           type: mongoose.Schema.Types.ObjectId,
           ref: 'Vendor',
        }
      },
    ],
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      phone: String,
    },
    paymentInfo: {
      id: String,
      status: String,
      type: String, // 'COD', 'Online'
    },
    itemsPrice: {
      type: Number,
      default: 0,
    },
    taxPrice: {
      type: Number,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    deliveredAt: {
      type: Date,
    },
    trackingNumber: {
      type: String,
    },
    courierName: {
      type: String,
    },
    estimatedDelivery: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
    couponCode: {
      type: String,
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    returnRequest: {
      requested: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
      },
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      requestedAt: {
        type: Date,
      },
    },
    statusHistory: [
      {
        status: {
          type: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
