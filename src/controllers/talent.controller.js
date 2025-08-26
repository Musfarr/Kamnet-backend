const Talent = require('../models/talent.model');
const Application = require('../models/application.model');
const Task = require('../models/task.model');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * @desc    Complete talent profile with additional details
 * @route   PUT /api/talents/complete-profile
 * @access  Private/Talent
 */
exports.completeProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      bio, 
      location, 
      picture,
      skills = []
    } = req.body;
    
    // The 'protect' middleware already attaches the talent object to req.user
    const talent = req.user;
    
    if (!talent) {
      return res.status(404).json({
        success: false,
        message: 'Talent not found'
      });
    }

    
    talent.name = name || talent.name;
    talent.phone = phone || talent.phone;
    talent.bio = bio || talent.bio;
    talent.location = location || talent.location;
    talent.picture = picture || talent.picture;
    talent.profileCompleted = true;
    talent.skills = skills;
    
    await talent.save();
    
    const talentData = {
      id: talent._id,
      name: talent.name,
      email: talent.email,
      role: talent.role,
      picture: talent.picture,
      phone: talent.phone,
      bio: talent.bio,
      location: talent.location,
      profileCompleted: talent.profileCompleted,
      skills: talent.skills || [],
      token: req.headers.authorization ? req.headers.authorization.split(' ')[1] : null
    };
    
    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      ...talentData
    });
  } catch (err) {
    logger.error(`Complete profile error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get talent applications
 * @route   GET /api/talents/applications
 * @access  Private/Talent
 */
exports.getTalentApplications = async (req, res, next) => {
  try {
    // Find all applications by this talent
    const applications = await Application.find({ talent: req.userId })
      .populate({
        path: 'task',
        select: 'title budget status location deadlineDate category user'
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Format to match frontend expectation
    const formattedApplications = applications.map(app => ({
      id: app._id,
      task: {
        id: app.task._id,
        title: app.task.title,
        budget: app.task.budget,
        status: app.task.status,
        location: app.task.location,
        deadline: app.task.deadlineDate,
        category: app.task.category,
        userId: app.task.user
      },
      coverLetter: app.coverLetter,
      proposedBudget: app.proposedBudget,
      status: app.status,
      estimatedCompletionTime: app.estimatedCompletionTime,
      createdAt: app.createdAt
    }));
    
    res.status(200).json({
      success: true,
      data: formattedApplications
    });
  } catch (err) {
    logger.error(`Get talent applications error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get talent dashboard stats
 * @route   GET /api/talents/dashboard
 * @access  Private/Talent
 */
exports.getTalentDashboard = async (req, res, next) => {
  try {
    // Get talent applications count by status
    const pendingCount = await Application.countDocuments({
      talent: req.userId,
      status: 'pending'
    });

    const acceptedCount = await Application.countDocuments({
      talent: req.userId,
      status: 'accepted'
    });

    const rejectedCount = await Application.countDocuments({
      talent: req.userId,
      status: 'rejected'
    });

    const withdrawnCount = await Application.countDocuments({
      talent: req.userId,
      status: 'withdrawn'
    });

    // Get recent applications
    const recentApplications = await Application.find({ talent: req.userId })
      .populate({
        path: 'task',
        select: 'title budget status location deadlineDate category'
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recommended tasks based on talent applications (matching categories)
    // First get the categories the talent has applied to
    const appliedTasks = await Application.find({ talent: req.userId })
      .populate('task', 'category')
      .distinct('task.category');

    // Then find open tasks in those categories, excluding those already applied to
    const appliedTaskIds = await Application.find({ talent: req.userId })
      .distinct('task');

    const recommendedTasks = await Task.find({
      _id: { $nin: appliedTaskIds },
      category: { $in: appliedTasks },
      status: 'open'
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          pending: pendingCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
          withdrawn: withdrawnCount,
          total: pendingCount + acceptedCount + rejectedCount + withdrawnCount
        },
        recentApplications,
        recommendedTasks
      }
    });
  } catch (err) {
    logger.error(`Get talent dashboard error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Get talent profile
 * @route   GET /api/talents/:id
 * @access  Public
 */
exports.getTalentProfile = async (req, res, next) => {
  try {
    const talent = await Talent.findById(req.params.id)
      .select('-__v -updatedAt')
      .lean();

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: 'Talent not found'
      });
    }

    // Get completed tasks count
    const completedTasksCount = await Application.countDocuments({
      talent: talent._id,
      status: 'accepted'
    });

    // Add additional profile info
    talent.completedTasks = completedTasksCount;

    res.status(200).json({
      success: true,
      data: talent
    });
  } catch (err) {
    logger.error(`Get talent profile error: ${err.message}`);
    next(err);
  }
};

/**
 * @desc    Update talent profile
 * @route   PUT /api/talents/profile
 * @access  Private/Talent
 */
exports.updateTalentProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      bio,
      location,
      picture,
      skills,
      hourlyRate,
      address,
      city,
      country,
      postalCode
    } = req.body;

    const talent = await Talent.findById(req.user.id);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: 'Talent not found'
      });
    }

    // Update fields
    if (name) talent.name = name;
    if (phone) talent.phone = phone;
    if (bio) talent.bio = bio;
    if (location) talent.location = location;
    if (picture) talent.picture = picture;
    if (skills) talent.skills = skills;
    if (hourlyRate) talent.hourlyRate = hourlyRate;
    if (address) talent.address = address;
    if (city) talent.city = city;
    if (country) talent.country = country;
    if (postalCode) talent.postalCode = postalCode;

    talent.updatedAt = Date.now();
    const updatedTalent = await talent.save();

    res.status(200).json({
      success: true,
      data: updatedTalent
    });
  } catch (err) {
    logger.error(`Update talent profile error: ${err.message}`);
    next(err);
  }
};
