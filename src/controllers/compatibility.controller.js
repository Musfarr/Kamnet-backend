const Task = require('../models/task.model');
const User = require('../models/user.model');
const Application = require('../models/application.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * This controller provides direct compatibility with the frontend apiClient.js
 * ensuring that all responses match exactly what the frontend expects
 */

/**
 * @desc    Get all tasks with pagination and filtering
 * @route   GET /api/tasks
 * @access  Public
 */
exports.getTasks = async (req, res, next) => {
  try {
    // Extract pagination parameters
    const { page, limit, skip } = req.pagination;
    
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
      currency: task.currency || 'PKR',
      location: task.location,
      category: task.category,
      skills: task.skills || [],
      deadline: task.deadlineDate,
      status: task.status,
      createdAt: task.createdAt,
      user: {
        id: task.user._id,
        name: task.user.name,
        picture: task.user.picture || null
      },
      applicationsCount: task.applicationsCount || 0,
      coordinates: task.coordinates || null
    }));
    
    // Set total count for pagination middleware
    res.totalCount = totalCount;
    
    res.status(200).json(formattedTasks);
  } catch (err) {
    logger.error(`Get tasks error: ${err.message}`);
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

// Helper function to calculate distance between two coordinates
function calculateDistance(coords1, coords2) {
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
