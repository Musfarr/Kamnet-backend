const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const { createLogger } = require('../utils/logger');
const { generateToken, generateRefreshToken, verifyRefreshToken, blacklistToken, generatePasswordResetToken } = require('../utils/token');
const emailService = require('../utils/emailService');

const logger = createLogger();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Generate JWT token and send response with user data
 * @param {Object} user - User document from MongoDB
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const sendTokenResponse = async (user, statusCode, res) => {
  // Generate access token
  const { token, expires: accessTokenExpires } = generateToken({ 
    id: user._id,
    role: user.role 
  });
  
  // Generate refresh token
  const { refreshToken, expires: refreshTokenExpires } = generateRefreshToken(user._id);
  
  // Save refresh token hash to user document if in production
  if (process.env.NODE_ENV === 'production') {
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = refreshTokenExpires;
    await user.save({ validateBeforeSave: false });
  }

  // Remove sensitive data
  const userData = user.toObject();
  delete userData.password;
  delete userData.refreshToken;
  delete userData.refreshTokenExpiry;
  delete userData.passwordResetToken;
  delete userData.passwordResetExpire;

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken, 
    accessTokenExpires,
    refreshTokenExpires,
    user: userData  // Return user as a separate object for test compatibility
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    // Send welcome email (non-blocking)
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailErr) {
      // Don't fail registration if email fails
      logger.warn(`Welcome email failed: ${emailErr.message}`);
    }

    // Generate token and send response
    await sendTokenResponse(user, 201, res);
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token and send response
    sendTokenResponse(user, 200, res);
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Login or register with Google OAuth
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { token, role } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No Google token provided'
      });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user's Google ID if they don't have one
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = user.picture || picture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId,
        picture,
        role: role || 'user'
      });
    }

    // Generate token and send response
    sendTokenResponse(user, 200, res);
  } catch (err) {
    logger.error(`Google auth error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    logger.error(`Get me error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Log user out / clear cookie and blacklist token
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    // Get token from authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Blacklist the token
      blacklistToken(token);
      
      // If user has refresh token stored, invalidate it
      if (req.userId) {
        await User.findByIdAndUpdate(req.userId, {
          $unset: { refreshToken: 1, refreshTokenExpiry: 1 }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    logger.error(`Logout error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid refresh token'
      });
    }

    // Find the user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const { token, expires } = generateToken({ 
      id: user._id,
      role: user.role 
    });

    res.status(200).json({
      success: true,
      token,
      expires
    });
  } catch (err) {
    logger.error(`Refresh token error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Forgot password - send password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // For security reasons, still say success even if user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset email will be sent'
      });
    }

    // Generate reset token
    const { resetToken, resetTokenHash, resetTokenExpiry } = generatePasswordResetToken();

    // Save reset token to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpire = new Date(resetTokenExpiry);
    await user.save({ validateBeforeSave: false });

    // Send email with reset token
    try {
      await emailService.sendPasswordResetEmail({
        email: user.email,
        token: resetToken,
        name: user.name
      });

      res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset email will be sent'
      });
    } catch (emailError) {
      // If email fails, remove token from user
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error(`Password reset email error: ${emailError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (err) {
    logger.error(`Forgot password error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Reset password using token
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    try {
      // Import crypto to handle token hashing
      const crypto = require('crypto');

      // Hash the token from the URL
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with matching token and valid expiry
      const user = await User.findOne({
        passwordResetToken: resetTokenHash,
        passwordResetExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Update password and clear reset fields
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      
      // Save the updated user
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (hashError) {
      logger.error(`Error hashing reset token: ${hashError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token format'
      });
    }
  } catch (err) {
    logger.error(`Reset password error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while resetting password'
    });
  }
};
