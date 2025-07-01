const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a task title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  budget: {
    type: Number,
    required: [true, 'Please add a budget amount']
  },
  currency: {
    type: String,
    default: 'PKR',
    enum: ['PKR', 'USD']
  },
  location: {
    type: String,
    required: [true, 'Please add a location'],
    default: 'Lahore, Pakistan'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Design',
      'Development',
      'Writing',
      'Translation',
      'Marketing',
      'Admin Support',
      'Customer Service',
      'Sales',
      'Other'
    ]
  },
  skills: [{
    type: String,
    trim: true
  }],
  deadlineDate: {
    type: Date,
    required: [true, 'Please add a deadline date']
  },
  address: {
    street: String,
    city: {
      type: String,
      required: [true, 'Please add a city']
    },
    province: {
      type: String,
      required: [true, 'Please add a province']
    }
  },
  coordinates: {
    lat: {
      type: Number,
      required: [true, 'Please add latitude']
    },
    lng: {
      type: Number,
      required: [true, 'Please add longitude']
    }
  },
  applicationsCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for populating applications
TaskSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'task',
  justOne: false
});

// Index for better query performance
TaskSchema.index({ location: 'text', title: 'text', description: 'text' });
TaskSchema.index({ coordinates: '2dsphere' });
TaskSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model('Task', TaskSchema);
