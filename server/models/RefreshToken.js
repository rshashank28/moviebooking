const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    tokenHash: {
      type: String,
      index: true
    },
    family: {
      type: String,
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    replacedByToken: {
      type: String,
      default: null
    },
    ipAddress: String,
    userAgent: String
  },
  {
    timestamps: true
  }
);

// TTL index to automatically prune expired tokens from MongoDB
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1, family: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
