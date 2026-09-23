const User = require('../models/User');
const Organizer = require('../models/Organizer');
const RefreshToken = require('../models/RefreshToken');
const {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  hashToken
} = require('../utils/jwt');
const ApiResponse = require('../utils/apiResponse');
const crypto = require('crypto');
const logger = require('../utils/logger');

// @route   POST /api/auth/register
// @desc    Register new customer or organizer
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, organizationName, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return ApiResponse.error(
        res,
        'An account with this email address already exists',
        409,
        'EMAIL_EXISTS'
      );
    }

    // Handle referral tracking if provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    }

    const assignedRole = role === 'ORGANIZER' ? 'ORGANIZER' : 'CUSTOMER';
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: assignedRole,
      referredBy: referrer ? referrer._id : null,
      loyaltyPoints: referrer ? 150 : 100, // Welcome bonus for user
      isEmailVerified: process.env.NODE_ENV === 'test' ? true : false,
      emailVerificationToken
    });

    // If organizer registration, initialize Organizer profile record
    if (assignedRole === 'ORGANIZER') {
      await Organizer.create({
        user: user._id,
        organizationName: organizationName || `${name}'s Events`,
        businessEmail: email.toLowerCase(),
        businessPhone: phone || 'N/A'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    return ApiResponse.created(res, 'Account registered successfully', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      verificationToken: process.env.NODE_ENV !== 'production' ? rawVerificationToken : undefined
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get tokens
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return ApiResponse.error(
        res,
        'Invalid email or password',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(
        res,
        'Invalid email or password',
        401,
        'INVALID_CREDENTIALS'
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

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    let organizerProfile = null;
    if (user.role === 'ORGANIZER') {
      organizerProfile = await Organizer.findOne({ user: user._id });
    }

    return ApiResponse.success(res, 'Login successful', {
      user: user.toJSON(),
      organizerProfile,
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/refresh-token
// @desc    Rotate refresh token and issue new access token with reuse detection
// @access  Public
const refreshTokenHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiResponse.error(
        res,
        'Refresh token is required',
        400,
        'TOKEN_REQUIRED'
      );
    }

    const { userId, newRefreshToken } = await rotateRefreshToken(refreshToken, req);
    const user = await User.findById(userId);

    if (!user || user.status === 'SUSPENDED') {
      return ApiResponse.error(
        res,
        'User account no longer active',
        401,
        'USER_INACTIVE'
      );
    }

    const newAccessToken = generateAccessToken(user);

    return ApiResponse.success(res, 'Token refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    return ApiResponse.error(
      res,
      err.message || 'Invalid or expired refresh token. Please sign in again.',
      401,
      'INVALID_REFRESH_TOKEN'
    );
  }
};

// @route   POST /api/auth/logout
// @desc    Revoke refresh token & sign out
// @access  Public
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshToken.findOneAndUpdate(
        { $or: [{ token: refreshToken }, { tokenHash }] },
        { isRevoked: true }
      );
    }
    return ApiResponse.success(res, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/auth/me
// @desc    Get currently authenticated user details
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let organizerProfile = null;
    if (user.role === 'ORGANIZER') {
      organizerProfile = await Organizer.findOne({ user: user._id });
    }

    return ApiResponse.success(res, 'Profile retrieved successfully', {
      user: user.toJSON(),
      organizerProfile
    });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/auth/update-profile
// @desc    Update profile info
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, preferredCity } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    if (preferredCity) {
      updates['preferences.preferredCity'] = preferredCity;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    return ApiResponse.success(res, 'Profile updated successfully', {
      user: updatedUser.toJSON()
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/forgot-password
// @desc    Generate secure password reset token (hashed in DB, not leaked in logs)
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Avoid user enumeration
      return ApiResponse.success(
        res,
        'If an account exists with this email, password reset instructions have been generated.'
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    logger.debug(`Password reset generated for user ${user._id}`);

    return ApiResponse.success(res, 'Password reset token generated', {
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/reset-password
// @desc    Reset password using valid token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return ApiResponse.error(res, 'Token and new password are required', 400, 'INVALID_INPUT');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      $or: [
        { resetPasswordToken: tokenHash },
        { resetPasswordToken: token }
      ],
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return ApiResponse.error(
        res,
        'Password reset token is invalid or has expired',
        400,
        'INVALID_RESET_TOKEN'
      );
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Invalidate all active refresh tokens on password change
    await RefreshToken.updateMany({ user: user._id }, { isRevoked: true });

    return ApiResponse.success(res, 'Password reset successful. You can now log in with your new password.');
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/verify-email
// @desc    Verify user email address using token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return ApiResponse.error(res, 'Verification token is required', 400, 'TOKEN_REQUIRED');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      $or: [
        { emailVerificationToken: tokenHash },
        { emailVerificationToken: token }
      ]
    });

    if (!user) {
      return ApiResponse.error(res, 'Invalid or expired email verification link', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    user.isEmailVerified = true;
    user.status = 'ACTIVE';
    user.emailVerificationToken = undefined;
    await user.save();

    return ApiResponse.success(res, 'Email address verified successfully!');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refreshTokenHandler,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail
};
