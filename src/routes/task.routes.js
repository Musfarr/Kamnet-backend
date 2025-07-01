const express = require('express');
const router = express.Router();
const { 
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getUserTasks,
  getNearbyTasks
} = require('../controllers/task.controller');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const validationSchemas = require('../utils/validationSchemas');
const { param, query } = require('express-validator');

// Public routes
router.get('/', getTasks);
router.get('/nearby', [
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('distance').optional().isNumeric().withMessage('Distance must be a number')
], getNearbyTasks);
router.get('/:id', param('id').isMongoId().withMessage('Invalid task ID format'), getTask);

// Protected routes
router.post('/', protect, authorize('user'), validate(validationSchemas.createTask), createTask);
router.put('/:id', [
  protect,
  authorize('user'),
  param('id').isMongoId().withMessage('Invalid task ID format'),
  validate(validationSchemas.updateTask)
], updateTask);
router.delete('/:id', 
  protect, 
  authorize('user'), 
  param('id').isMongoId().withMessage('Invalid task ID format'),
  deleteTask
);
router.get('/me/tasks', protect, authorize('user'), getUserTasks);

module.exports = router;
