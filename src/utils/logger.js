const winston = require('winston');
const fs = require('fs');
const path = require('path');

/**
 * Creates a Winston logger with console and file transports
 * @param {Object} module - Optional module object for context
 * @returns {winston.Logger} - Configured Winston logger
 */
const createLogger = (module) => {
  // Ensure log directory exists
  const logDir = 'logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Get filename for context
  const filename = module ? path.basename(module.filename) : 'app';
  
  // Define log level based on environment
  const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  
  // Define custom formats
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    winston.format.json()
  );
  
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => 
      `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`
    )
  );
  
  // Create logger with transports
  const logger = winston.createLogger({
    level,
    defaultMeta: { service: 'kamnet-api', context: filename },
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        format: consoleFormat
      })
    ]
  });
  
  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    );
    
    logger.add(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: fileFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    );
  }

  // Add request logging helper
  logger.logRequest = (req, res, responseTime) => {
    const { method, originalUrl, ip } = req;
    const statusCode = res.statusCode;
    const userId = req.userId || 'unauthenticated';
    
    // Log based on status code
    if (statusCode >= 500) {
      logger.error(`${method} ${originalUrl} ${statusCode} - ${responseTime}ms`, {
        method, url: originalUrl, statusCode, responseTime, ip, userId
      });
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} ${statusCode} - ${responseTime}ms`, {
        method, url: originalUrl, statusCode, responseTime, ip, userId
      });
    } else if (process.env.NODE_ENV !== 'production') {
      logger.info(`${method} ${originalUrl} ${statusCode} - ${responseTime}ms`);
    } else if (process.env.NODE_ENV === 'production' && statusCode === 201) {
      // Log resource creation in production
      logger.info(`${method} ${originalUrl} ${statusCode} - ${responseTime}ms`, {
        method, url: originalUrl, statusCode
      });
    }
  };
  
  return logger;
};

module.exports = { createLogger };

