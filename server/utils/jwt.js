const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN
} = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const logger = require('./logger');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN || '1h' }
  );
};

const generateRefreshToken = async (user, req = null, familyId = null) => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const family = familyId || crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] : '';
  const userAgent = req ? req.headers['user-agent'] : '';

  await RefreshToken.create({
    user: user._id,
    token,
    tokenHash,
    family,
    expiresAt,
    ipAddress,
    userAgent
  });

  return token;
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const rotateRefreshToken = async (oldTokenString, req = null) => {
  const oldHash = hashToken(oldTokenString);
  const existingToken = await RefreshToken.findOne({
    $or: [
      { token: oldTokenString },
      { tokenHash: oldHash }
    ]
  });

  if (!existingToken) {
    throw new Error('Invalid refresh token');
  }

  // Token Reuse Detection: If a revoked token is presented, compromise detected!
  // Invalidate ALL tokens in this family immediately!
  if (existingToken.isRevoked) {
    logger.warn(`SECURITY ALERT: Refresh token reuse detected for user ${existingToken.user}. Invalidating token family ${existingToken.family}.`);
    await RefreshToken.updateMany(
      { user: existingToken.user, family: existingToken.family },
      { isRevoked: true }
    );
    throw new Error('Compromised session detected. Please sign in again.');
  }

  if (existingToken.expiresAt < new Date()) {
    throw new Error('Refresh token has expired');
  }

  // Revoke old token
  const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
  const newHash = hashToken(newRefreshTokenString);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  existingToken.isRevoked = true;
  existingToken.replacedByToken = newRefreshTokenString;
  await existingToken.save();

  // Issue new token in same family
  const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] : '';
  const userAgent = req ? req.headers['user-agent'] : '';

  await RefreshToken.create({
    user: existingToken.user,
    token: newRefreshTokenString,
    tokenHash: newHash,
    family: existingToken.family,
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
  rotateRefreshToken,
  hashToken
};
