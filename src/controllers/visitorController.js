const asyncHandler = require('express-async-handler');
const Visitor = require('../models/Visitor');

// @desc    Track a visitor explicitly
// @route   POST /api/visitors/track
// @access  Public
const trackVisitorEndpoint = asyncHandler(async (req, res) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const location = req.body.location || 'Unknown';

    // Basic bot exclusion
    if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
        return res.status(200).json({ status: 'ignored' });
    }

    if (ipAddress) {
      let visitor = await Visitor.findOne({ ipAddress });

      if (visitor) {
        // We allow the frontend's sessionStorage to manage throttling per session,
        // so we can increment the backend counter freely when called.
        visitor.lastVisit = Date.now();
        visitor.visitCount += 1;
        if (location && location !== 'Unknown') {
          visitor.location = location; // Update location if provided
        }
        await visitor.save();
      } else {
        await Visitor.create({
          ipAddress,
          userAgent,
          location,
        });
      }
      res.status(200).json({ status: 'tracked' });
    } else {
      res.status(400).json({ message: 'No IP address found' });
    }
  } catch (error) {
    console.error('Visitor tracking error:', error);
    res.status(500).json({ message: 'Tracking failed' });
  }
});

// @desc    Get all visitors
// @route   GET /api/visitors
// @access  Private/Admin
const getVisitors = asyncHandler(async (req, res) => {
  const visitors = await Visitor.find({}).sort({ lastVisit: -1 });
  res.json(visitors);
});

module.exports = {
  trackVisitorEndpoint,
  getVisitors,
};
