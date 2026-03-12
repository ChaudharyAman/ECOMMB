const mongoose = require('mongoose');

const visitorSchema = mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true, // We track unique IPs. In a more complex setup, we might use session IDs.
    },
    userAgent: {
      type: String,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
    },
    visitCount: {
      type: Number,
      default: 1,
    },
    location: {
      type: String,
      default: 'Unknown',
    },
  },
  {
    timestamps: true,
  }
);

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
