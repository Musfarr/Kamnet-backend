const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  googleAuth, 
  getMe, 
  logout,
  refreshToken,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const validationSchemas = require('../utils/validationSchemas');

// Public routes
router.post('/register', validate(validationSchemas.register), register);
router.post('/login', validate(validationSchemas.login), login);
router.post('/google', validate(validationSchemas.googleAuth), googleAuth);
router.post('/refresh-token', validate(validationSchemas.refreshToken), refreshToken);
router.post('/forgot-password', validate(validationSchemas.forgotPassword), forgotPassword);
router.put('/reset-password/:token', validate(validationSchemas.resetPassword), resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
