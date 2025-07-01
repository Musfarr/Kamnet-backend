const { createLogger } = require('../utils/logger');
const logger = createLogger();

/**
 * Request logging middleware for tracking API performance and requests
 */
const requestLogger = (req, res, next) => {
  // Get request start time
  const startTime = Date.now();
  
  // Store original end method to override
  const originalEnd = res.end;
  
  // Override end method to calculate duration and log the request
  res.end = function(chunk, encoding) {
    // Calculate request duration
    const responseTime = Date.now() - startTime;
    
    // Execute original end method
    originalEnd.call(this, chunk, encoding);
    
    // Log the request using the Winston logger helper
    logger.logRequest(req, res, responseTime);
  };
  
  next();
};

module.exports = requestLogger;
