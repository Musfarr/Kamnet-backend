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
 * @route   PUT /api/users
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      bio, 
      location, 
      picture 
    } = req.body;

    // Find user by ID
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is trying to update their own profile
    if (user._id.toString() !== req.userId) {
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
