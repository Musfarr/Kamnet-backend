const { createLogger } = require('../utils/logger');
const logger = createLogger();

/**
 * Custom error class for API errors with status code
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error type conversion middleware to handle common error types
 */
const errorConverter = (err, req, res, next) => {
  let error = err;

  // If it's not already an ApiError, convert it to one
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(message, statusCode);
  }

  next(error);
};

/**
 * Central error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  const { statusCode, message } = err;
  
  // Log errors differently based on environment
  if (process.env.NODE_ENV === 'production') {
    // For production, log the error in a structured way
    logger.error({
      code: statusCode,
      message: message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    // For development, be more verbose in the console
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
    console.error(err);
  }
  
  // Specific handling for mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(val => val.message)
    });
  }
  
  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      field
    });
  }
  
  // Handle mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Handle file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // Default response for all other error types
  const status = statusCode || 500;
  const response = {
    success: false,
    message: message || 'Internal Server Error',
  };

  // Add stack trace in development environment only
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = {
  ApiError,
  errorConverter,
  errorHandler
};
