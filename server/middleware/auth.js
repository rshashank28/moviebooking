const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');
const ApiResponse = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.error(
        res,
        'Authentication required. Please provide a valid Bearer token.',
        401,
        'UNAUTHORIZED'
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return ApiResponse.error(
        res,
        'Invalid or expired authentication token',
        401,
        'INVALID_TOKEN'
      );
    }

    // Retrieve user from DB to verify active status
    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(
        res,
        'User account associated with this token no longer exists',
        401,
        'USER_NOT_FOUND'
      );
    }

    if (user.status === 'SUSPENDED') {
      return ApiResponse.error(
        res,
        'Your account has been suspended. Please contact customer support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    req.user = user;
    next();
  } catch (err) {
    return ApiResponse.error(res, err.message, 500, 'AUTH_ERROR');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(
        res,
        'Authentication required before role authorization',
        401,
        'UNAUTHORIZED'
      );
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Access forbidden: requires one of the following roles: [${roles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

// Optional auth: populates req.user if token is present, but doesn't block unauthenticated requests
const optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findById(decoded.id);
        if (user && user.status === 'ACTIVE') {
          req.user = user;
        }
      }
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
