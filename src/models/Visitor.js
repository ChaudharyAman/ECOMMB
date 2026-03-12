const mongoose = require('mongoose');

const visitorSchema = mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true, 
    },
    ipAddress: {
      type: String,
      required: true, // we still require it for logging but it's no longer uniquely identifying the visitor 
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
