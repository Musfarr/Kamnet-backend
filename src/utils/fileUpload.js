const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('./logger');

const logger = createLogger();

// Ensure upload directory exists
const uploadDir = path.join('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.userId;
    const userUploadDir = path.join(uploadDir, `user-${userId}`);
    
    // Create user-specific directory if it doesn't exist
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

// File filter to allow only images
const imageFileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
  // Check extension
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure limits
const limits = {
  fileSize: 5 * 1024 * 1024 // 5 MB
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits
});

/**
 * Handle file upload errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleUploadError = (req, res, next) => {
  return (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size cannot exceed 5MB'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      logger.error(`File upload error: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  };
};

module.exports = {
  upload,
  handleUploadError
};
