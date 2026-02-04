const mongoose = require('mongoose');

const vendorSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true,
    },
    storeName: {
      type: String,
      required: true,
      unique: true,
    },
    storeDescription: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
    },
    logo: {
      type: String,
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    kycDocuments: [
      {
        docType: String, // e.g., 'GST', 'PAN', 'ID_PROOF'
        url: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      }
    ],
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      verified: { type: Boolean, default: false },
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    commissionRate: {
      type: Number,
      default: 0, // Global or Category specific override
    },
    balance: {
      current: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }, // Unsettled
      withdrawn: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vendor', vendorSchema);
