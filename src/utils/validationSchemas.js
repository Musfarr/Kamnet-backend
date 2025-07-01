const { body, param, query } = require('express-validator');

/**
 * Express-validator schemas for API endpoints
 */
const validationSchemas = {
  // Auth validations
  register: [
    body('name')
      .trim()
      .not().isEmpty().withMessage('Name is required')
      .isLength({ max: 50 }).withMessage('Name cannot be more than 50 characters'),
    body('email')
      .trim()
      .not().isEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    body('password')
      .not().isEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role')
      .optional()
      .isIn(['user', 'talent']).withMessage('Role must be either user or talent')
  ],
  
  login: [
    body('email')
      .trim()
      .not().isEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    body('password')
      .not().isEmpty().withMessage('Password is required')
  ],
  
  googleAuth: [
    body('token')
      .not().isEmpty().withMessage('Google token is required'),
    body('role')
      .optional()
      .isIn(['user', 'talent']).withMessage('Role must be either user or talent')
  ],
  
  refreshToken: [
    body('refreshToken')
      .not().isEmpty().withMessage('Refresh token is required')
  ],
  
  forgotPassword: [
    body('email')
      .trim()
      .not().isEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address')
  ],
  
  resetPassword: [
    param('token')
      .not().isEmpty().withMessage('Reset token is required'),
    body('password')
      .not().isEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ],

  // User profile validations
  completeProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Name cannot be more than 50 characters'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Phone number cannot be longer than 20 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio cannot be more than 500 characters'),
    body('location')
      .optional()
      .trim(),
    body('picture')
      .optional()
      .trim()
      .isURL().withMessage('Picture must be a valid URL')
  ],
  
  // Task validations
  createTask: [
    body('title')
      .trim()
      .not().isEmpty().withMessage('Title is required')
      .isLength({ max: 100 }).withMessage('Title cannot be more than 100 characters'),
    body('description')
      .trim()
      .not().isEmpty().withMessage('Description is required')
      .isLength({ max: 2000 }).withMessage('Description cannot be more than 2000 characters'),
    body('budget')
      .not().isEmpty().withMessage('Budget is required')
      .isNumeric().withMessage('Budget must be a number')
      .custom(value => value > 0).withMessage('Budget must be greater than 0'),
    body('currency')
      .optional()
      .isIn(['PKR', 'USD']).withMessage('Currency must be PKR or USD'),
    body('location')
      .not().isEmpty().withMessage('Location is required'),
    body('category')
      .not().isEmpty().withMessage('Category is required')
      .isIn([
        'Design',
        'Development',
        'Writing',
        'Translation',
        'Marketing',
        'Admin Support',
        'Customer Service',
        'Sales',
        'Other'
      ]).withMessage('Invalid category'),
    body('skills')
      .optional()
      .isArray().withMessage('Skills must be an array'),
    body('deadlineDate')
      .not().isEmpty().withMessage('Deadline date is required')
      .isISO8601().withMessage('Deadline date must be a valid date')
      .custom(value => new Date(value) > new Date()).withMessage('Deadline must be in the future'),
    body('address.city')
      .not().isEmpty().withMessage('City is required'),
    body('address.province')
      .not().isEmpty().withMessage('Province is required'),
    body('coordinates.lat')
      .not().isEmpty().withMessage('Latitude is required')
      .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('coordinates.lng')
      .not().isEmpty().withMessage('Longitude is required')
      .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
  ],
  
  updateTask: [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Title cannot be more than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description cannot be more than 2000 characters'),
    body('budget')
      .optional()
      .isNumeric().withMessage('Budget must be a number')
      .custom(value => value > 0).withMessage('Budget must be greater than 0'),
    body('status')
      .optional()
      .isIn(['open', 'in-progress', 'completed', 'cancelled']).withMessage('Invalid status')
  ],
  
  // Application validations
  createApplication: [
    body('taskId')
      .not().isEmpty().withMessage('Task ID is required')
      .isMongoId().withMessage('Invalid task ID format'),
    body('coverLetter')
      .trim()
      .not().isEmpty().withMessage('Cover letter is required')
      .isLength({ max: 1000 }).withMessage('Cover letter cannot be more than 1000 characters'),
    body('proposedBudget')
      .not().isEmpty().withMessage('Proposed budget is required')
      .isNumeric().withMessage('Proposed budget must be a number')
      .custom(value => value > 0).withMessage('Proposed budget must be greater than 0'),
    body('estimatedCompletionTime.value')
      .not().isEmpty().withMessage('Estimated completion time value is required')
      .isNumeric().withMessage('Estimated completion time must be a number')
      .custom(value => value > 0).withMessage('Estimated completion time must be greater than 0'),
    body('estimatedCompletionTime.unit')
      .not().isEmpty().withMessage('Estimated completion time unit is required')
      .isIn(['hours', 'days', 'weeks']).withMessage('Unit must be hours, days, or weeks')
  ],
  
  updateApplicationStatus: [
    body('status')
      .not().isEmpty().withMessage('Status is required')
      .isIn(['accepted', 'rejected', 'withdrawn']).withMessage('Status must be accepted, rejected, or withdrawn')
  ]
};

module.exports = validationSchemas;
