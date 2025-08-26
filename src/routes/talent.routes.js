const express = require('express');
const router = express.Router();
const { 
  completeProfile,
  getTalentApplications,
  getTalentDashboard,
  getTalentProfile,
  updateTalentProfile
} = require('../controllers/talent.controller');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const validationSchemas = require('../utils/validationSchemas');

// Public routes
router.get('/:id', getTalentProfile);

// Protected talent routes
router.put('/complete-profile', protect, authorize('talent'), validate(validationSchemas.completeProfile), completeProfile);
router.get('/applications', protect, authorize('talent'), getTalentApplications);
router.get('/dashboard', protect, authorize('talent'), getTalentDashboard);
router.put('/profile', protect, authorize('talent'), updateTalentProfile);

module.exports = router;
