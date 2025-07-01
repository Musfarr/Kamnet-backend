const express = require('express');
const router = express.Router();
const { 
  getTasks,
  getFeaturedTasks,
  getMapMarkers,
  getNearbyTasks,
  updateTaskStatus
} = require('../controllers/compatibility.controller');
const { protect, authorize } = require('../middleware/auth');
const pagination = require('../middleware/pagination');

// Public routes
router.get('/tasks', pagination, getTasks);
router.get('/tasks/featured', getFeaturedTasks);
router.get('/map/markers', getMapMarkers);
router.get('/tasks/nearby', getNearbyTasks);

// Protected routes
router.put('/tasks/:id/status', protect, authorize('user'), updateTaskStatus);

module.exports = router;
