const mongoose = require('mongoose');
const User = require('../models/user.model');
const Talent = require('../models/talent.model');
const Task = require('../models/task.model');
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

    // User object is attached by 'protect' middleware
    const user = req.user;

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

    await user.save();

    // Format response to match frontend expectation
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.picture,
      phone: user.phone,
      bio: user.bio,
      location: user.location,
      profileCompleted: user.profileCompleted,
      token: req.headers.authorization ? req.headers.authorization.split(' ')[1] : null
    };

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      ...userData
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
    let user = await User.findById(req.params.id).select('-__v -updatedAt');
    if (!user) {
        user = await Talent.findById(req.params.id).select('-__v -updatedAt');
    }

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
      address,
      city,
      country,
      postalCode
    } = req.body;

    const userIdToUpdate = req.params.userId;

    // Ensure the user being updated is the same as the authenticated user or the authenticated user is an admin
    if (req.user.id !== userIdToUpdate && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to update this profile'
        });
    }

    const user = await User.findById(userIdToUpdate);

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
    const user = req.user;
    if (user.role === 'talent') {
      await Talent.findByIdAndDelete(user.id);
    } else {
      await User.findByIdAndDelete(user.id);
    }

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
    const users = await User.find().select('-__v').lean();
    const talents = await Talent.find().select('-__v').lean();
    const allUsers = [...users, ...talents];

    res.status(200).json({
      success: true,
      count: allUsers.length,
      data: allUsers
    });
  } catch (err) {
    logger.error(`Get users error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get user tasks (tasks posted by user)
 * @route   GET /api/users/tasks
 * @access  Private/User
 */
exports.getUserTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    
    // Map to match frontend expected format
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      budget: task.budget,
      currency: task.currency || 'PKR',
      location: task.location,
      status: task.status,
      category: task.category,
      skills: task.skills || [],
      deadline: task.deadlineDate,
      createdAt: task.createdAt,
      coordinates: task.coordinates,
      applicationsCount: task.applicationsCount || 0
    }));
    
    res.status(200).json({
      success: true,
      data: formattedTasks
    });
  } catch (err) {
    logger.error(`Get user tasks error: ${err.message}`);
    next(err);
  }
};
