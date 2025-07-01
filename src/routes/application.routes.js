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
const { param } = require('express-validator');

// All routes require authentication
router.use(protect);

// Create new application (talent only)
router.post('/', authorize('talent'), validate(validationSchemas.createApplication), createApplication);

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
