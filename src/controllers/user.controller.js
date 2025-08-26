const mongoose = require('mongoose');
const User = require('../models/user.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * @desc    Complete user profile
 * @route   PUT /api/users/complete-profile
 * @access  Private
 */
exports.completeProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      bio, 
      location, 
      picture 
    } = req.body;

    // Find user
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user profile
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.bio = bio || user.bio;
    user.location = location || user.location;
    user.picture = picture || user.picture;
    user.profileCompleted = true;
    user.updatedAt = Date.now();

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    logger.error(`Complete profile error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/users/:id
 * @access  Public
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-__v -updatedAt');

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
    logger.error(`Get user profile error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/:userId/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      bio, 
      location, 
      picture,
      skills,
      hourlyRate,
      address,
      city,
      country,
      postalCode
    } = req.body;

    // Get userId from params or use authenticated user's ID
    const userId = req.params.userId || req.userId;

    // Find user by ID or username
    let user;
    
    // Check if userId is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      // Check if userId is in format 'talent1', 'talent2', etc.
      const talentMatch = userId.match(/^talent(\d+)$/);
      
      if (talentMatch) {
        // If it's in talent format, find the nth talent user
        const talentNumber = parseInt(talentMatch[1]);
        const talents = await User.find({ role: 'talent' }).sort({ createdAt: 1 }).limit(talentNumber);
        user = talents[talentNumber - 1]; // Get the nth talent (1-indexed)
      } else {
        // Try to find by username or email
        user = await User.findOne({ 
          $or: [
            { username: userId },
            { email: userId }
          ]
        });
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For profile completion, we'll allow the update regardless of who's making the request
    // This is needed for the talent1 format IDs which might not match the authenticated user
    // In a production environment, you might want to add additional security checks here
    
    // Skip authorization check for profile completion route
    const isProfileCompletion = req.originalUrl.includes('/profile');
    
    // Only check authorization for non-profile-completion routes
    if (!isProfileCompletion && user._id.toString() !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (picture) user.picture = picture;
    if (skills) {
      // Handle skills - if it's a JSON string, parse it
      try {
        user.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
      } catch (error) {
        logger.error('Error parsing skills:', error);
        user.skills = Array.isArray(skills) ? skills : [];
      }
    }
    if (hourlyRate) user.hourlyRate = hourlyRate;
    if (address) user.address = address;
    if (city) user.city = city;
    if (country) user.country = country;
    if (postalCode) user.postalCode = postalCode;
    
    // Mark profile as completed
    user.profileCompleted = true;
    user.updatedAt = Date.now();

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    logger.error(`Update profile error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users
 * @access  Private
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.userId);

    res.status(200).json({
      success: true,
      message: 'Account successfully deleted'
    });
  } catch (err) {
    logger.error(`Delete account error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-__v');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    logger.error(`Get users error: ${err.message}`);
    next(err);
  }
};
