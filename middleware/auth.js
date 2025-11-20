const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const authMiddleware = {
  // Verify JWT token
  verifyToken: (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  },

  // Check if user has specific role
  requireRole: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No user information.'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    };
  },

  // Optional token verification (for public routes that can have optional auth)
  optionalAuth: (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't block the request
        console.log('Optional auth: Invalid token, continuing without user context');
      }
    }
    
    next();
  }
};

module.exports = authMiddleware;