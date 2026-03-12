const asyncHandler = require('express-async-handler');
const Visitor = require('../models/Visitor');

// @desc    Get all visitors
// @route   GET /api/visitors
// @access  Private/Admin
const getVisitors = asyncHandler(async (req, res) => {
  const visitors = await Visitor.find({}).sort({ lastVisit: -1 });
  res.json(visitors);
});

module.exports = {
  getVisitors,
};
