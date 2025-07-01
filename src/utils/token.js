const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createLogger } = require('./logger');

const logger = createLogger();

// In-memory token blacklist (would be replaced by Redis in real production)
const tokenBlacklist = new Set();

/**
 * Generate JWT token for authentication
 * 
 * @param {Object} payload - Token payload (usually user ID and role)
 * @returns {Object} - Object containing token and expiry date
 */
const generateToken = (payload) => {
  try {
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1d' }
    );
    
    const decoded = jwt.decode(token);
    
    return {
      token,
      expires: new Date(decoded.exp * 1000)
    };
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new Error('Error generating authentication token');
  }
};

/**
 * Generate refresh token
 * 
 * @param {String} userId - User ID
 * @returns {Object} - Object containing refresh token and expiry date
 */
const generateRefreshToken = (userId) => {
  try {
    // Using a longer expiry for refresh token
    const refreshToken = jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    
    const decoded = jwt.decode(refreshToken);
    
    return {
      refreshToken,
      expires: new Date(decoded.exp * 1000)
    };
  } catch (error) {
    logger.error('Refresh token generation error:', error);
    throw new Error('Error generating refresh token');
  }
};

/**
 * Verify JWT token
 * 
 * @param {String} token - Token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    // First check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else {
      throw error;
    }
  }
};

/**
 * Verify refresh token
 * 
 * @param {String} token - Refresh token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Refresh token has been revoked');
    }
    
    // Verify the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    return decoded;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else {
      throw error;
    }
  }
};

/**
 * Add token to blacklist
 * 
 * @param {String} token - Token to blacklist
 */
const blacklistToken = (token) => {
  try {
    if (!token) return;
    
    // Add to blacklist
    tokenBlacklist.add(token);
    
    // Get token expiry to know when to remove it from blacklist
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const expiryMs = decoded.exp * 1000 - Date.now();
      
      // Schedule removal from blacklist after expiry to prevent memory leak
      // In production, this would use Redis with TTL
      if (expiryMs > 0) {
        setTimeout(() => {
          tokenBlacklist.delete(token);
        }, expiryMs);
      }
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
  }
};

/**
 * Generate password reset token and calculate expiry
 * 
 * @returns {Object} - Object containing reset token and expiry date
 */
const generatePasswordResetToken = () => {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token for storage
  const resetTokenHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiry (10 minutes)
  const resetTokenExpiry = Date.now() + 10 * 60 * 1000;
  
  return {
    resetToken,       // Unhashed - to send via email
    resetTokenHash,   // Hashed - to store in database
    resetTokenExpiry  // Expiry timestamp
  };
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  blacklistToken,
  generatePasswordResetToken
};
