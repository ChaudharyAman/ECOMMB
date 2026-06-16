/**
 * Helper to recursively sanitize strings by removing script tags and other HTML nodes.
 * This acts as a robust XSS filtering layer for standard JSON/URL-encoded payloads.
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;

  return value
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove <script> blocks
    .replace(/<[^>]*>/g, '') // Strip remaining HTML tags
    .trim();
};

const sanitizeInput = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  }

  if (typeof data === 'object') {
    const cleanObject = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cleanObject[key] = sanitizeInput(data[key]);
      }
    }
    return cleanObject;
  }

  return data;
};

/**
 * Express middleware to sanitize body, query, and parameter data from XSS inputs
 */
const xssSanitizer = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
};

module.exports = {
  xssSanitizer,
  sanitizeInput,
};
