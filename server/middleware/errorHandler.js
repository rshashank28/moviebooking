const logger = require('../utils/logger');
const { NODE_ENV } = require('../config/env');

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
};

const errorHandler = (err, req, res, next) => {
  logger.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
  if (err.stack && NODE_ENV === 'development') {
    logger.debug(err.stack);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let errors = err.errors || null;

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value entered';
    code = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0];
    errors = [{ field, message: `${field} already exists` }];
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors ? { errors } : {}),
    ...(NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
