const express = require('express');
const router = express.Router();
const { 
  getTalentApplications,
  getTalentDashboard,
  getTalentProfile,
  updateTalentProfile
} = require('../controllers/talent.controller');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/:id', getTalentProfile);

// Protected talent routes
router.get('/applications', protect, authorize('talent'), getTalentApplications);
router.get('/dashboard', protect, authorize('talent'), getTalentDashboard);
router.put('/profile', protect, authorize('talent'), updateTalentProfile);

module.exports = router;
