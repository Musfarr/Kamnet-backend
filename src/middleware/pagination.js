/**
 * Pagination middleware to standardize API responses with pagination
 * This matches the format expected by the frontend apiClient.js
 */
const pagination = (req, res, next) => {
  // Get page and limit from query parameters with defaults
  const page = parseInt(req.query._page || req.query.page || 1, 10);
  const limit = parseInt(req.query._limit || req.query.limit || 10, 10);
  
  // Calculate skip for MongoDB
  const skip = (page - 1) * limit;
  
  // Add pagination data to request object
  req.pagination = {
    page,
    limit,
    skip
  };
  
  // Store the original send function
  const originalSend = res.send;
  
  // Override the send function to add pagination headers
  res.send = function(body) {
    // If totalCount is set by the controller
    if (res.totalCount !== undefined) {
      // Add headers for compatibility with the frontend
      res.set('X-Total-Count', res.totalCount.toString());
      res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
  next();
};

module.exports = pagination;
