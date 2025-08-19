const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  username: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [function() {
      // Password is required unless using Google OAuth
      return !this.googleId;
    }, 'Please add a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'talent', 'admin'],
    default: 'user'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values (for non-Google users)
  },
  picture: {
    type: String,
    default: 'https://randomuser.me/api/portraits/lego/1.jpg'
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be longer than 20 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  location: {
    type: String,
    default: 'Lahore, Pakistan'
  },
  // Additional profile fields
  skills: {
    type: [String],
    default: []
  },
  hourlyRate: {
    type: Number,
    default: 0
  },
  address: {
    type: String,
    maxlength: [100, 'Address cannot be more than 100 characters']
  },
  city: {
    type: String,
    maxlength: [50, 'City cannot be more than 50 characters']
  },
  country: {
    type: String,
    maxlength: [50, 'Country cannot be more than 50 characters']
  },
  postalCode: {
    type: String,
    maxlength: [20, 'Postal code cannot be more than 20 characters']
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  refreshToken: String,
  refreshTokenExpiry: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt before save
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Sign JWT and return - DEPRECATED, use token.js utility instead
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1d' }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
