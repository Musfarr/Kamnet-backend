const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getUserTasks,
  getNearbyTasks,
  getFeaturedTasks,
  getMapMarkers,
  updateTaskStatus,
  getTaskApplications
} = require('../controllers/task.controller');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const validationSchemas = require('../utils/validationSchemas');
const { param, query } = require('express-validator');
const pagination = require('../middleware/pagination');

// Public routes
router.get('/', pagination, getTasks);
router.get('/featured', getFeaturedTasks);
router.get('/map/markers', getMapMarkers);
router.get('/nearby', [
  query('lat').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid number between -90 and 90'),
  query('lng').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid number between -180 and 180'),
  query('radius').optional().isNumeric().withMessage('Radius must be a number')
], validate(), getNearbyTasks);
router.get('/:id', param('id').isMongoId().withMessage('Invalid task ID format'), getTask);

// Protected routes
router.post('/', protect, authorize('user'), validate(validationSchemas.createTask), createTask);
router.put('/:id', [
  protect,
  authorize('user'),
  param('id').isMongoId().withMessage('Invalid task ID format'),
  validate(validationSchemas.updateTask)
], updateTask);
router.delete('/:id', [
  protect, 
  authorize('user'), 
  param('id').isMongoId().withMessage('Invalid task ID format')
], deleteTask);
router.put('/:id/status', [
    protect,
    authorize('user'),
    param('id').isMongoId().withMessage('Invalid task ID format')
], updateTaskStatus);
router.get('/me/tasks', protect, authorize('user'), getUserTasks);

// Route to get applications for a specific task, only accessible by the task owner
router.get('/:taskId/applications', [
  protect,
  authorize('user'),
  param('taskId').isMongoId().withMessage('Invalid task ID format'),
  validate()
], getTaskApplications);

module.exports = router;
