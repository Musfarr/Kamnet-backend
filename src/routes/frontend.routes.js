const express = require('express');
const router = express.Router();
const { 
  getUserTasks,
  getTalentApplications,
  getTaskApplications,
  applyToTask,
  completeProfile
} = require('../controllers/frontend.controller');
const { protect, authorize } = require('../middleware/auth');
const { param, body } = require('express-validator');
const { validate } = require('../middleware/validator');

// All routes require authentication
router.use(protect);

// User routes
router.get('/user/tasks', authorize('user'), getUserTasks);

// Talent routes
router.get('/talent/applications', authorize('talent'), getTalentApplications);

// Profile routes (any authenticated user)
router.put('/complete-profile', [
  body('name').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters'),
  body('phone').optional().trim().isLength({ min: 8, max: 15 }).withMessage('Phone number must be between 8 and 15 characters'),
  body('location').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Location must be between 2 and 100 characters'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
], validate(), completeProfile);

// Task application routes
router.get('/task/:taskId/applications', [
  param('taskId').isMongoId().withMessage('Invalid task ID')
], getTaskApplications);

router.post('/tasks/:taskId/apply', [
  authorize('talent'),
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('coverLetter').isString().trim().isLength({ min: 50, max: 1000 }).withMessage('Cover letter must be between 50 and 1000 characters'),
  body('proposedBudget').isNumeric().withMessage('Proposed budget must be a number'),
  body('estimatedCompletionTime').isObject().withMessage('Estimated completion time must be an object'),
  body('estimatedCompletionTime.value').isNumeric().withMessage('Estimated completion time value must be a number'),
  body('estimatedCompletionTime.unit').isIn(['hours', 'days', 'weeks']).withMessage('Estimated completion time unit must be one of: hours, days, weeks')
], validate(), applyToTask);

module.exports = router;
