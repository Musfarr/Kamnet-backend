const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  talent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverLetter: {
    type: String,
    required: [true, 'Please include a cover letter or proposal'],
    maxlength: [1000, 'Cover letter cannot be more than 1000 characters']
  },
  proposedBudget: {
    type: Number,
    required: [true, 'Please specify your proposed budget']
  },
  currency: {
    type: String,
    default: 'PKR',
    enum: ['PKR', 'USD']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  estimatedCompletionTime: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks'],
      default: 'days'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure a talent can only apply once to a task
ApplicationSchema.index({ task: 1, talent: 1 }, { unique: true });

// Prevent multiple submissions to the same task
ApplicationSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Application = this.constructor;
    const existingApplication = await Application.findOne({
      task: this.task,
      talent: this.talent
    });

    if (existingApplication) {
      const error = new Error('You have already applied to this task');
      error.name = 'DuplicateApplicationError';
      return next(error);
    }
  }
  next();
});

// Update task application count after save
ApplicationSchema.post('save', async function() {
  try {
    const Task = mongoose.model('Task');
    await Task.findByIdAndUpdate(
      this.task,
      { $inc: { applicationsCount: 1 } }
    );
  } catch (error) {
    console.error('Error updating task applications count:', error);
  }
});

module.exports = mongoose.model('Application', ApplicationSchema);
