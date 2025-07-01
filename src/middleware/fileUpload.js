const { upload, handleUploadError } = require('../utils/fileUpload');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * Middleware for handling profile picture uploads
 */
exports.profilePictureUpload = (req, res, next) => {
  const uploadMiddleware = upload.single('profilePicture');
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      return handleUploadError(req, res, next)(err);
    }
    
    if (req.file) {
      // Format the file path for frontend consumption
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.kamnet.pk' 
        : `http://localhost:${process.env.PORT || 8000}`;
        
      req.profilePicture = `${baseUrl}/uploads/user-${req.userId}/${req.file.filename}`;
      logger.debug(`Profile picture uploaded: ${req.profilePicture}`);
    }
    
    next();
  });
};

/**
 * Middleware for handling task attachment uploads
 */
exports.taskAttachmentUpload = (req, res, next) => {
  const uploadMiddleware = upload.array('taskAttachments', 5); // Max 5 files
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      return handleUploadError(req, res, next)(err);
    }
    
    if (req.files && req.files.length > 0) {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.kamnet.pk' 
        : `http://localhost:${process.env.PORT || 8000}`;
      
      req.taskAttachments = req.files.map(file => ({
        filename: file.originalname,
        path: `${baseUrl}/uploads/user-${req.userId}/${file.filename}`
      }));
      
      logger.debug(`Task attachments uploaded: ${req.files.length} files`);
    }
    
    next();
  });
};
