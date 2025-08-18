const { verifyToken } = require('../utils/token');
const { createLogger } = require('../utils/logger');
const User = require('../models/user.model');

const logger = createLogger();

/**
 * Middleware to authenticate and protect routes
 * Verifies JWT token in the Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (format: "Bearer token")
      token = req.headers.authorization.split(' ')[1];

      // Verify token using our token utility
      const decoded = verifyToken(token);
      
      // Add user ID and role from payload to request
      req.userId = decoded.id;
      req.role = decoded.role;
      
      // Always fetch the user to have full user object available in controllers
      const user = await User.findById(req.userId);
      if (!user) {
        throw new Error('User no longer exists');
      }
      
      // Add full user object to request
      req.user = user;
      
      next();
    } catch (error) {
      logger.error(`Auth middleware error: ${error.message}`, {
        token: token ? `${token.substring(0, 10)}...` : 'none', // Log first few chars for debugging
        path: req.originalUrl,
        method: req.method
      });
      
      // Return appropriate error message based on the type of error
      return res.status(401).json({
        success: false,
        message: error.message === 'Token expired' 
          ? 'Your session has expired. Please log in again.' 
          : 'Not authorized to access this resource'
      });
    }
  }

  // No token found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

/**
 * Middleware to restrict access based on user role
 * @param {string[]} roles - Array of allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user role is included in the allowed roles
    if (!roles.includes(req.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
