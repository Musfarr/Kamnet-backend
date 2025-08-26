const express = require('express');
const router = express.Router();
const { 
  createApplication,
  getTaskApplications,
  updateApplicationStatus,
  getApplicationById
} = require('../controllers/application.controller');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const validationSchemas = require('../utils/validationSchemas');
const { param, body } = require('express-validator');

// All routes require authentication
router.use(protect);

// Create new application (talent only)
router.post('/', authorize('talent'), validate(validationSchemas.createApplication), createApplication);

// Route for frontend compatibility to apply to a task
router.post('/tasks/:taskId/apply', [
  authorize('talent'),
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('coverLetter').isString().trim().isLength({ min: 50, max: 1000 }).withMessage('Cover letter must be between 50 and 1000 characters'),
  body('proposedBudget').isNumeric().withMessage('Proposed budget must be a number'),
  body('estimatedCompletionTime').isObject().withMessage('Estimated completion time must be an object'),
  body('estimatedCompletionTime.value').isNumeric().withMessage('Estimated completion time value must be a number'),
  body('estimatedCompletionTime.unit').isIn(['hours', 'days', 'weeks']).withMessage('Estimated completion time unit must be one of: hours, days, weeks')
], validate(), createApplication);

// Get applications for a task (task owner only)
router.get('/task/:taskId', 
  param('taskId').isMongoId().withMessage('Invalid task ID format'),
  getTaskApplications
);

// Get application by ID (task owner or talent)
router.get('/:id', 
  param('id').isMongoId().withMessage('Invalid application ID format'),
  getApplicationById
);

// Update application status (task owner or talent depending on action)
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid application ID format'),
  validate(validationSchemas.updateApplicationStatus)
], updateApplicationStatus);

module.exports = router;
