const Application = require('../models/application.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * @desc    Create a new application
 * @route   POST /api/applications
 * @access  Private/Talent
 */
exports.createApplication = async (req, res, next) => {
  try {
    const { taskId, coverLetter, proposedBudget, estimatedCompletionTime } = req.body;
    
    // Check if task exists
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if task is still open
    if (task.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Task is ${task.status} and no longer accepting applications`
      });
    }
    
    // Check if talent has already applied to this task
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
      estimatedCompletionTime,
      currency: task.currency
    });
    
    // Populate task and talent information for response
    const populatedApplication = await Application.findById(application._id)
      .populate({
        path: 'task',
        select: 'title description budget status location deadlineDate category'
      })
      .populate({
        path: 'talent',
        select: 'name picture location'
      });
    
    res.status(201).json({
      success: true,
      data: populatedApplication
    });
  } catch (err) {
    logger.error(`Create application error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get applications for a task
 * @route   GET /api/applications/task/:taskId
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
    
    // Check if user is the task owner
    if (task.user.toString() !== req.userId && req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these applications'
      });
    }
    
    const applications = await Application.find({ task: req.params.taskId })
      .populate({
        path: 'talent',
        select: 'name picture location bio'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (err) {
    logger.error(`Get task applications error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Update application status
 * @route   PUT /api/applications/:id
 * @access  Private (task owner or talent, depending on action)
 */
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !['accepted', 'rejected', 'withdrawn'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status (accepted, rejected, withdrawn)'
      });
    }
    
    let application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Get task details
    const task = await Task.findById(application.task);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Associated task not found'
      });
    }
    
    // Authorization check based on action
    if (status === 'withdrawn') {
      // Only talent can withdraw their own application
      if (application.talent.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to withdraw this application'
        });
      }
    } else if (['accepted', 'rejected'].includes(status)) {
      // Only task owner can accept/reject
      if (task.user.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this application status'
        });
      }
      
      // If accepting, update task status to in-progress
      if (status === 'accepted') {
        task.status = 'in-progress';
        await task.save();
        
        // Reject all other applications for this task
        await Application.updateMany(
          { 
            task: task._id, 
            _id: { $ne: application._id },
            status: 'pending'
          },
          { status: 'rejected' }
        );
      }
    }
    
    // Update application status
    application.status = status;
    await application.save();
    
    // Get fully populated application
    const updatedApplication = await Application.findById(req.params.id)
      .populate({
        path: 'task',
        select: 'title description budget status location deadlineDate category'
      })
      .populate({
        path: 'talent',
        select: 'name picture location'
      });
    
    res.status(200).json({
      success: true,
      data: updatedApplication
    });
  } catch (err) {
    logger.error(`Update application status error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get application by ID
 * @route   GET /api/applications/:id
 * @access  Private (task owner or talent)
 */
exports.getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: 'task',
        select: 'title description budget status location deadlineDate category user'
      })
      .populate({
        path: 'talent',
        select: 'name picture location bio'
      });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check if user is authorized to view this application
    const isTaskOwner = application.task.user.toString() === req.userId;
    const isApplicant = application.talent._id.toString() === req.userId;
    
    if (!isTaskOwner && !isApplicant && req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }
    
    res.status(200).json({
      success: true,
      data: application
    });
  } catch (err) {
    logger.error(`Get application error: ${err.message}`);
    next(err);
  }
};
