const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN
} = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const logger = require('./logger');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateRefreshToken = async (user, req = null) => {
  const token = crypto.randomBytes(40).toString('hex');
  // Default to 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] : '';
  const userAgent = req ? req.headers['user-agent'] : '';

  const refreshTokenDoc = await RefreshToken.create({
    user: user._id,
    token,
    expiresAt,
    ipAddress,
    userAgent
  });

  return refreshTokenDoc.token;
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const rotateRefreshToken = async (oldTokenString, req = null) => {
  const existingToken = await RefreshToken.findOne({ token: oldTokenString });

  if (!existingToken || existingToken.isRevoked || existingToken.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  // Revoke old token
  const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  existingToken.isRevoked = true;
  existingToken.replacedByToken = newRefreshTokenString;
  await existingToken.save();

  // Create new active refresh token
  const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] : '';
  const userAgent = req ? req.headers['user-agent'] : '';

  await RefreshToken.create({
    user: existingToken.user,
    token: newRefreshTokenString,
    expiresAt,
    ipAddress,
    userAgent
  });

  return {
    userId: existingToken.user,
    newRefreshToken: newRefreshTokenString
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  rotateRefreshToken
};
