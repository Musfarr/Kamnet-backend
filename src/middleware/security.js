const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * Configure and export security middleware
 * @param {Express} app - Express application
 */
exports.setupSecurityMiddleware = (app) => {
  // Set security HTTP headers with Helmet
  app.use(helmet());

  // Enable CORS
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
      ? [
          process.env.FRONTEND_URL || 'https://kamnet.pk',
          /\.kamnet\.pk$/  // Allow all subdomains
        ]
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages', 'X-Current-Page', 'X-Limit'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  app.use(cors(corsOptions));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        path: req.originalUrl,
        ip: req.ip,
        method: req.method
      });
      
      res.status(options.statusCode).json({
        success: false,
        message: options.message
      });
    }
  });
  app.use('/api/', limiter);

  // Body parser middleware
  app.use(express.json({ limit: '10kb' })); // Limit JSON body size
  app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Limit URL-encoded body size

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());

  // Prevent parameter pollution (e.g. duplicate query parameters)
  app.use(hpp({
    whitelist: [
      'category',
      'skills',
      'location',
      'budget',
      'status',
      'sort',
      'page',
      'limit'
    ]
  }));

  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // More strict in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "*.amazonaws.com", "*.cloudinary.com", "*.googleusercontent.com"],
        connectSrc: ["'self'", process.env.FRONTEND_URL || "https://kamnet.pk"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }));
  }

  // Security logging middleware
  app.use((req, res, next) => {
    // Check for suspicious activity
    const suspiciousPatterns = [
      /union\s+select/i,
      /select.+from.+where/i,
      /<script>/i,
      /document\.cookie/i,
      /eval\(/i,
      /javascript:/i
    ];

    const fullUrl = req.originalUrl;
    const body = req.body ? JSON.stringify(req.body) : '';
    
    // Check URL and body for suspicious patterns
    const containsSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(fullUrl) || pattern.test(body)
    );

    if (containsSuspicious) {
      logger.warn('Potential security threat detected', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        user: req.userId || 'unauthenticated',
        body: body.substring(0, 100) // Log only part of the body for security
      });
    }

    next();
  });

  // Add security headers
  app.use((req, res, next) => {
    // Set additional security headers not covered by helmet
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Security response headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  });

  logger.info('Security middleware configured successfully');
};

/**
 * Initialize security features that need to be run early in the request pipeline
 * @param {Express} app - Express application
 */
exports.setupEarlySecurityMiddleware = (app) => {
  // Trust proxy for proper IP detection behind load balancers
  app.set('trust proxy', 1);

  // Set secure flag for cookies in production
  if (process.env.NODE_ENV === 'production') {
    app.set('cookie', {
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    });
  }
};
