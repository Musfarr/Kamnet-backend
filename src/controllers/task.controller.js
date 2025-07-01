const mongoose = require('mongoose');
const Task = require('../models/task.model');
const Application = require('../models/application.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private/User
 */
exports.createTask = async (req, res, next) => {
  try {
    // Add user to request body
    req.body.user = req.userId;
    
    const task = await Task.create(req.body);
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (err) {
    logger.error(`Create task error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get all tasks
 * @route   GET /api/tasks
 * @access  Public
 */
exports.getTasks = async (req, res, next) => {
  try {
    let query;
    
    // Copy req.query
    const reqQuery = { ...req.query };
    
    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    
    // Remove fields from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);
    
    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Finding resource
    query = Task.find(JSON.parse(queryStr));
    
    // Handle search parameter
    if (req.query.search) {
      query = query.find({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { location: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }
    
    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Task.countDocuments(query);
    
    query = query.skip(startIndex).limit(limit);
    
    // Executing query
    const tasks = await query;
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination,
      data: tasks
    });
  } catch (err) {
    logger.error(`Get tasks error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Public
 */
exports.getTask = async (req, res, next) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    logger.error(`Get task error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: 'Error retrieving task'
    });
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private/User
 */
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Make sure user owns the task
    if (task.user.toString() !== req.userId && req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }
    
    // Don't allow updating task if it's already in progress or completed
    if (['in-progress', 'completed'].includes(task.status) && req.body.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Task is already ${task.status} and cannot be modified`
      });
    }
    
    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    logger.error(`Update task error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private/User
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Make sure user owns the task
    if (task.user.toString() !== req.userId && req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }
    
    // Delete all applications associated with this task
    await Application.deleteMany({ task: req.params.id });
    
    // Delete the task using deleteOne (updated from deprecated remove method)
    await task.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    logger.error(`Delete task error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get tasks created by user
 * @route   GET /api/tasks/me
 * @access  Private/User
 */
exports.getUserTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.userId }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    logger.error(`Get user tasks error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get nearby tasks
 * @route   GET /api/tasks/nearby
 * @access  Public
 */
exports.getNearbyTasks = async (req, res, next) => {
  try {
    const { lng, lat, distance = 10 } = req.query;
    
    // Calculate radius using radians
    // Earth radius is approximately 6,378 km
    const radius = distance / 6378;
    
    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude coordinates'
      });
    }
    
    const tasks = await Task.find({
      coordinates: { 
        $geoWithin: { 
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius] 
        } 
      },
      status: 'open'
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    logger.error(`Get nearby tasks error: ${err.message}`);
    next(err);
  }
};
