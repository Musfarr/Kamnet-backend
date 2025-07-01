const User = require('../models/user.model');
const Task = require('../models/task.model');
const Application = require('../models/application.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * This controller handles direct compatibility with the existing frontend apiClient.js
 * It ensures seamless integration by matching the exact structure of responses
 * expected by the frontend components.
 */

/**
 * @desc    Get user tasks (tasks posted by user)
 * @route   GET /api/frontend/user/tasks
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

/**
 * @desc    Get talent applications (applications made by talent)
 * @route   GET /api/frontend/talent/applications
 * @access  Private/Talent
 */
exports.getTalentApplications = async (req, res, next) => {
  try {
    // Find all applications by this talent
    const applications = await Application.find({ talent: req.userId })
      .populate({
        path: 'task',
        select: 'title budget status location deadlineDate category user'
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Format to match frontend expectation
    const formattedApplications = applications.map(app => ({
      id: app._id,
      task: {
        id: app.task._id,
        title: app.task.title,
        budget: app.task.budget,
        status: app.task.status,
        location: app.task.location,
        deadline: app.task.deadlineDate,
        category: app.task.category,
        userId: app.task.user
      },
      coverLetter: app.coverLetter,
      proposedBudget: app.proposedBudget,
      status: app.status,
      estimatedCompletionTime: app.estimatedCompletionTime,
      createdAt: app.createdAt
    }));
    
    res.status(200).json({
      success: true,
      data: formattedApplications
    });
  } catch (err) {
    logger.error(`Get talent applications error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get task applications (applications for a specific task)
 * @route   GET /api/frontend/task/:taskId/applications
 * @access  Private/User (task owner)
 */
exports.getTaskApplications = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Ensure the user is the task owner
    if (task.user.toString() !== req.userId && req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view applications for this task'
      });
    }
    
    // Get all applications for this task
    const applications = await Application.find({ task: req.params.taskId })
      .populate({
        path: 'talent',
        select: 'name picture location bio profileCompleted'
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Format to match frontend expectation
    const formattedApplications = applications.map(app => ({
      id: app._id,
      talent: {
        id: app.talent._id,
        name: app.talent.name,
        picture: app.talent.picture,
        location: app.talent.location,
        bio: app.talent.bio || '',
        profileCompleted: app.talent.profileCompleted
      },
      coverLetter: app.coverLetter,
      proposedBudget: app.proposedBudget,
      status: app.status,
      estimatedCompletionTime: app.estimatedCompletionTime,
      createdAt: app.createdAt
    }));
    
    res.status(200).json({
      success: true,
      data: formattedApplications
    });
  } catch (err) {
    logger.error(`Get task applications error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Apply to a task
 * @route   POST /api/frontend/tasks/:taskId/apply
 * @access  Private/Talent
 */
exports.applyToTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { coverLetter, proposedBudget, estimatedCompletionTime } = req.body;
    
    // Check if task exists
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if task is open
    if (task.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Task is ${task.status} and not accepting applications`
      });
    }
    
    // Check if talent has already applied
    const existingApplication = await Application.findOne({
      task: taskId,
      talent: req.userId
    });
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this task'
      });
    }
    
    // Create application
    const application = await Application.create({
      task: taskId,
      talent: req.userId,
      coverLetter,
      proposedBudget,
      currency: task.currency || 'PKR',
      estimatedCompletionTime
    });
    
    // Format response to match frontend expectation
    const formattedApplication = {
      id: application._id,
      task: {
        id: task._id,
        title: task.title,
        budget: task.budget,
        status: task.status,
        location: task.location
      },
      coverLetter: application.coverLetter,
      proposedBudget: application.proposedBudget,
      status: application.status,
      estimatedCompletionTime: application.estimatedCompletionTime,
      createdAt: application.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: formattedApplication
    });
  } catch (err) {
    logger.error(`Apply to task error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Complete user profile with additional details
 * @route   PUT /api/frontend/complete-profile
 * @access  Private
 */
exports.completeProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      bio, 
      location, 
      picture,
      skills = []  // Include skills for talent profiles
    } = req.body;
    
    // Find the user
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
    
    // If user is talent and skills provided, save those too
    if (user.role === 'talent' && skills.length > 0) {
      user.skills = skills;
    }
    
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
      skills: user.skills || [], // Include skills field for consistency
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
