const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const ApiResponse = require('../utils/apiResponse');

router.get('/', async (req, res) => {
  const redis = getRedisClient();
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redis.isMemoryFallback ? 'in-memory (fallback)' : 'connected';

  return ApiResponse.success(res, 'ShowPulse Ticketing API is running smoothly', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    redis: redisStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
