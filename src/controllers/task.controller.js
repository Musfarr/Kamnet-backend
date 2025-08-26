const mongoose = require('mongoose');
const Task = require('../models/task.model');
const User = require('../models/user.model');
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
    // Ensure only users or admins can create tasks
    if (req.user.role !== 'user' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only users are allowed to create tasks.'
      });
    }

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
 * @desc    Get all tasks with pagination and filtering
 * @route   GET /api/tasks
 * @access  Public
 */
exports.getTasks = async (req, res, next) => {
  try {
    // Extract pagination parameters from pagination middleware if available
    const page = req.pagination ? req.pagination.page : (parseInt(req.query.page, 10) || 1);
    const limit = req.pagination ? req.pagination.limit : (parseInt(req.query.limit, 10) || 10);
    const skip = req.pagination ? req.pagination.skip : (page - 1) * limit;
    
    // Build filter query
    const query = {};
    
    // Status filter - default to open tasks
    query.status = req.query.status || 'open';
    
    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Location filter (partial match)
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: 'i' };
    }
    
    // Search filter (searches in title and description)
    if (req.query.q || req.query.search) {
      const searchTerm = req.query.q || req.query.search;
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name picture')
      .lean();
    
    // Get total count for pagination
    const totalCount = await Task.countDocuments(query);
    
    // Format response to match frontend expectations
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      budget: task.budget,
      price: task.budget, // Alias for frontend compatibility
      currency: task.currency || 'PKR',
      location: task.location,
      category: task.category,
      skills: task.skills || [],
      deadline: task.deadlineDate,
      dueDate: task.deadlineDate, // Alias for frontend
      status: task.status,
      createdAt: task.createdAt,
      user: task.user ? {
        id: task.user._id,
        name: task.user.name,
        picture: task.user.picture || null
      } : null,
      applicationsCount: task.applicationsCount || 0,
      coordinates: task.coordinates || null
    }));
    
    // Set total count for pagination middleware
    res.status(200).json({
      success: true,
      count: totalCount,
      data: formattedTasks
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
 * @desc    Get nearby tasks based on coordinates
 * @route   GET /api/tasks/nearby
 * @access  Public
 */
exports.getNearbyTasks = async (req, res, next) => {
  try {
    // Extract coordinates from query
    const { lat, lng, radius = 10 } = req.query; // radius in kilometers
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Find tasks within the given radius
    const tasks = await Task.find({
      status: 'open',
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) * 1000 // convert to meters
        }
      }
    })
    .limit(10)
    .populate('user', 'name picture')
    .lean();
    
    // Helper function to calculate distance between two coordinates
    const calculateDistance = (coords1, coords2) => {
        // Haversine formula
        const toRad = value => (value * Math.PI) / 180;
        const R = 6371; // Earth radius in km
        
        const dLat = toRad(coords2.lat - coords1.lat);
        const dLon = toRad(coords2.lng - coords1.lng);
        
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        
        return d; // Distance in km
    }

    // Format response to match frontend expectations
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description.substring(0, 100) + (task.description.length > 100 ? '...' : ''),
      budget: task.budget,
      currency: task.currency || 'PKR',
      location: task.location,
      category: task.category,
      distance: calculateDistance(
        { lat: parseFloat(lat), lng: parseFloat(lng) },
        { lat: task.coordinates.lat, lng: task.coordinates.lng }
      ).toFixed(1) + ' km'
    }));
    
    res.status(200).json(formattedTasks);
  } catch (err) {
    logger.error(`Get nearby tasks error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get featured tasks (limited to 3)
 * @route   GET /api/tasks/featured
 * @access  Public
 */
exports.getFeaturedTasks = async (req, res, next) => {
  try {
    // Get 3 featured tasks based on recent creation and application count
    const featuredTasks = await Task.find({ status: 'open' })
      .sort({ applicationsCount: -1, createdAt: -1 })
      .limit(3)
      .populate('user', 'name picture')
      .lean();
    
    // Format response to match frontend expectations
    const formattedTasks = featuredTasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description.substring(0, 100) + (task.description.length > 100 ? '...' : ''),
      price: task.budget, // Alias for frontend
      budget: task.budget,
      currency: task.currency || 'PKR',
      location: task.location,
      category: task.category,
      deadline: task.deadlineDate,
      applicationsCount: task.applicationsCount || 0
    }));
    
    res.status(200).json(formattedTasks);
  } catch (err) {
    logger.error(`Get featured tasks error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get map markers for tasks
 * @route   GET /api/map/markers
 * @access  Public
 */
exports.getMapMarkers = async (req, res, next) => {
  try {
    // Build filter query
    const query = { status: 'open' };
    
    // City filter if provided
    if (req.query.city) {
      query['address.city'] = { $regex: req.query.city, $options: 'i' };
    }
    
    // Get tasks with coordinates
    const tasks = await Task.find(query)
      .where('coordinates').exists(true)
      .select('title budget currency coordinates category')
      .lean();
    
    // Format response to match frontend expectations
    const markers = tasks.map(task => ({
      id: task._id,
      position: {
        lat: task.coordinates.lat,
        lng: task.coordinates.lng
      },
      title: task.title,
      budget: `${task.currency || 'PKR'} ${task.budget}`,
      category: task.category
    }));
    
    res.status(200).json(markers);
  } catch (err) {
    logger.error(`Get map markers error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Update task status
 * @route   PUT /api/tasks/:id/status
 * @access  Private/User
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Find task
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check ownership
    if (task.user.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }
    
    // Update status
    task.status = status;
    await task.save();
    
    res.status(200).json({
      success: true,
      message: 'Task status updated',
      data: {
        id: task._id,
        status: task.status
      }
    });
  } catch (err) {
    logger.error(`Update task status error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get task applications (applications for a specific task)
 * @route   GET /api/tasks/:taskId/applications
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
