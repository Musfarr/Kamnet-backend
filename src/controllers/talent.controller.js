const User = require('../models/user.model');
const Application = require('../models/application.model');
const Task = require('../models/task.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * @desc    Get talent applications
 * @route   GET /api/talents/applications
 * @access  Private/Talent
 */
exports.getTalentApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ talent: req.userId })
      .populate({
        path: 'task',
        select: 'title description budget status location deadlineDate category createdAt'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (err) {
    logger.error(`Get talent applications error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get talent dashboard stats
 * @route   GET /api/talents/dashboard
 * @access  Private/Talent
 */
exports.getTalentDashboard = async (req, res, next) => {
  try {
    // Get talent applications count by status
    const pendingCount = await Application.countDocuments({
      talent: req.userId,
      status: 'pending'
    });

    const acceptedCount = await Application.countDocuments({
      talent: req.userId,
      status: 'accepted'
    });

    const rejectedCount = await Application.countDocuments({
      talent: req.userId,
      status: 'rejected'
    });

    const withdrawnCount = await Application.countDocuments({
      talent: req.userId,
      status: 'withdrawn'
    });

    // Get recent applications
    const recentApplications = await Application.find({ talent: req.userId })
      .populate({
        path: 'task',
        select: 'title budget status location deadlineDate category'
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recommended tasks based on talent applications (matching categories)
    // First get the categories the talent has applied to
    const appliedTasks = await Application.find({ talent: req.userId })
      .populate('task', 'category')
      .distinct('task.category');

    // Then find open tasks in those categories, excluding those already applied to
    const appliedTaskIds = await Application.find({ talent: req.userId })
      .distinct('task');

    const recommendedTasks = await Task.find({
      _id: { $nin: appliedTaskIds },
      category: { $in: appliedTasks },
      status: 'open'
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          pending: pendingCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
          withdrawn: withdrawnCount,
          total: pendingCount + acceptedCount + rejectedCount + withdrawnCount
        },
        recentApplications,
        recommendedTasks
      }
    });
  } catch (err) {
    logger.error(`Get talent dashboard error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get talent profile
 * @route   GET /api/talents/:id
 * @access  Public
 */
exports.getTalentProfile = async (req, res, next) => {
  try {
    const talent = await User.findById(req.params.id)
      .select('-__v -updatedAt')
      .lean();

    if (!talent || talent.role !== 'talent') {
      return res.status(404).json({
        success: false,
        message: 'Talent not found'
      });
    }

    // Get completed tasks count
    const completedTasksCount = await Application.countDocuments({
      talent: talent._id,
      status: 'accepted'
    });

    // Add additional profile info
    talent.completedTasks = completedTasksCount;

    res.status(200).json({
      success: true,
      data: talent
    });
  } catch (err) {
    logger.error(`Get talent profile error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Update talent profile
 * @route   PUT /api/talents/profile
 * @access  Private/Talent
 */
exports.updateTalentProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    
    // Find talent
    const talent = await User.findById(req.userId);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: 'Talent not found'
      });
    }

    // Check if user is talent
    if (talent.role !== 'talent') {
      return res.status(403).json({
        success: false,
        message: 'User is not a talent'
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'role' && key !== 'email') {
        talent[key] = updates[key];
      }
    });

    talent.updatedAt = Date.now();
    await talent.save();

    res.status(200).json({
      success: true,
      data: talent
    });
  } catch (err) {
    logger.error(`Update talent profile error: ${err.message}`);
    next(err);
  }
};
