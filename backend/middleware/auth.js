const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Middleware to check if user owns the resource
const authorizeResource = (resourceField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceField] || req.body[resourceField] || req.query[resourceField];

    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({ error: 'Access denied. You do not own this resource.' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeResource
};
