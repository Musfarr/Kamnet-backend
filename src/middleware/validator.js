const { validationResult } = require('express-validator');

/**
 * Middleware to validate request data
 * Used with express-validator
 */
exports.validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check if there are any validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // If there are validation errors, format and return them
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  };
};
