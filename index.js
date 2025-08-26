require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { createLogger } = require('./src/utils/logger');
const { setupSwagger } = require('./src/utils/swagger');
const connectDB = require('./src/config/db');
const { errorConverter, errorHandler } = require('./src/middleware/error');
const requestLogger = require('./src/middleware/requestLogger');
const { setupEarlySecurityMiddleware, setupSecurityMiddleware } = require('./src/middleware/security');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const talentRoutes = require('./src/routes/talent.routes');
const taskRoutes = require('./src/routes/task.routes');
const applicationRoutes = require('./src/routes/application.routes');
const frontendRoutes = require('./src/routes/frontend.routes');
const compatibilityRoutes = require('./src/routes/compatibility.routes');

// Create logger instance
const logger = createLogger();

// Initialize express app
const app = express();

// Apply early security configurations
setupEarlySecurityMiddleware(app);

// Connect to database (unless we're in test mode)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// CORS Configuration - Allow frontend domain with exposure of pagination headers
const corsOptions = {
  origin: [
    // Production domains
    process.env.FRONTEND_URL || 'https://kamnet.pk', 
    'https://www.kamnetcorp.com',
    'https://kamnetcorp.com',
    /\.kamnet\.pk$/,
    /\.kamnetcorp\.com$/,
    // Development domains (always allowed for local development)
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages', 'X-Current-Page', 'X-Limit']
};

// Body parser middleware - prevent oversized payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(requestLogger);

// Apply CORS middleware first to handle pre-flight requests
app.use(cors(corsOptions));

// Apply comprehensive security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: ['category', 'skills', 'location', 'budget', 'status', 'sort', 'page', 'limit']
}));

// Rate limiting with different thresholds for production/development
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Stricter in production
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});
app.use('/api', apiLimiter);

// Set up static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up Swagger API Documentation
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/talents', talentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/frontend', frontendRoutes);
app.use('/api', compatibilityRoutes); // Direct compatibility with frontend routes

// Health check endpoint with enhanced system information
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      usage: process.memoryUsage(),
      free: require('os').freemem(),
      total: require('os').totalmem()
    },
    uptime: process.uptime(),
    db: global.dbConnection ? 'CONNECTED' : 'DISCONNECTED'
  };
  
  // Limit information in production for security
  if (process.env.NODE_ENV === 'production') {
    delete healthInfo.memory;
  }
  
  res.status(200).json(healthInfo);
});

// Root route with API information
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Kamnet Marketplace API',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// Error converter middleware - must be placed before error handler
app.use(errorConverter);

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use((req, res) => {
  // Log 404 requests for analysis
  logger.debug(`404 Not Found: ${req.method} ${req.originalUrl}`, { 
    ip: req.ip,
    userAgent: req.headers['user-agent'] 
  });
  
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Get port from environment variables or use default
const PORT = process.env.PORT || 8000;

// Only start the server if we're not in test mode
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

// Export for testing
module.exports = { app };

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = { app, server };
