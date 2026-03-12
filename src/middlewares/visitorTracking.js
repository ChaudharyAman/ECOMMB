const Visitor = require('../models/Visitor');

const trackVisitor = async (req, res, next) => {
  try {
    // If the user is logged in, we optionally don't need to track them as a visitor.
    // However, it's safer to track all IPs or just skip if req.user exists.
    // Let's track non-logged in users mainly, but we might not know if they are logged in at the generic request level 
    // depending on where this is placed. Let's just track by IP for general site traffic.
    
    // Express trust proxy might need to be set in server.js if behind a proxy
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Basic bot exclusion (optional but good practice)
    if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
        return next();
    }

    if (ipAddress) {
      let visitor = await Visitor.findOne({ ipAddress });

      if (visitor) {
        // Update last visit and increment count if it's been a while (e.g., a new session)
        // For simplicity, we just update the lastVisit timestamp on every request.
        // In a real app, you might throttle this so it doesn't hit the DB on every single request.
        
        // Only update if the last visit was more than 30 minutes ago to avoid spamming the DB
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (visitor.lastVisit < thirtyMinutesAgo) {
            visitor.lastVisit = Date.now();
            visitor.visitCount += 1;
            await visitor.save();
        }
      } else {
        // Create new visitor record
        await Visitor.create({
          ipAddress,
          userAgent,
        });
      }
    }
  } catch (error) {
    console.error('Visitor tracking error:', error);
    // Don't block the request if tracking fails
  }

  next();
};

module.exports = { trackVisitor };
