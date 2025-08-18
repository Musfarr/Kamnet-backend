const express = require('express');
const router = express.Router();
const { 
  completeProfile,
  getUserProfile,
  updateProfile,
  deleteAccount,
  getUsers
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const validationSchemas = require('../utils/validationSchemas');
const { param } = require('express-validator');

// Public routes
router.get('/:id', param('id').isMongoId().withMessage('Invalid user ID format'), getUserProfile);

// Protected routes
router.put('/complete-profile', protect, validate(validationSchemas.completeProfile), completeProfile);
router.put('/:userId/profile', protect, param('userId').isString().withMessage('Invalid user ID format'), validate(validationSchemas.completeProfile), updateProfile);
router.put('/', protect, validate(validationSchemas.completeProfile), updateProfile);
router.delete('/', protect, deleteAccount);

// Admin routes
router.get('/', protect, authorize('admin'), getUsers);

module.exports = router;
