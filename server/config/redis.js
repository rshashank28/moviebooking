const Redis = require('ioredis');
const { REDIS_URL } = require('./env');
const logger = require('../utils/logger');

// In-Memory Fallback Store with TTL handling for environments without a running Redis server
class MemoryRedisClient {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
    this.isMemoryFallback = true;
    logger.info('Initialized In-Memory Key-Value & Lock Store (Redis-compatible fallback)');
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, ...args) {
    this.store.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    
    // Handle 'EX' or 'PX' arguments
    if (args && args.length >= 2) {
      const mode = String(args[0]).toUpperCase();
      const duration = parseInt(args[1], 10);
      if (mode === 'EX' && duration > 0) {
        this.expire(key, duration);
      } else if (mode === 'PX' && duration > 0) {
        this.pexpire(key, duration);
      }
    }
    return 'OK';
  }

  async setnx(key, value) {
    if (this.store.has(key)) {
      return 0;
    }
    this.store.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    return 1;
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async expire(key, seconds) {
    if (!this.store.has(key)) return 0;
    if (this.timers.has(key)) clearTimeout(this.timers.get(key));
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, seconds * 1000);
    this.timers.set(key, timer);
    return 1;
  }

  async pexpire(key, ms) {
    if (!this.store.has(key)) return 0;
    if (this.timers.has(key)) clearTimeout(this.timers.get(key));
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, ms);
    this.timers.set(key, timer);
    return 1;
  }

  async ttl(key) {
    return this.store.has(key) ? 600 : -2;
  }

  async keys(pattern) {
    const allKeys = Array.from(this.store.keys());
    if (!pattern || pattern === '*') return allKeys;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return allKeys.filter((k) => regex.test(k));
  }

  async flushall() {
    this.store.clear();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    return 'OK';
  }
}

let redisClient;

try {
  const realClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't hang if redis is not running
    connectTimeout: 2000,
    lazyConnect: true
  });

  realClient.connect()
    .then(() => {
      logger.info('Connected to Redis server successfully.');
      redisClient = realClient;
    })
    .catch((err) => {
      logger.warn(`Redis server not reachable (${err.message}). Using high-performance in-memory lock store.`);
      redisClient = new MemoryRedisClient();
    });

  realClient.on('error', (err) => {
    if (!redisClient || redisClient instanceof MemoryRedisClient) return;
    logger.warn(`Redis connection error (${err.message}). Falling back to in-memory store.`);
    redisClient = new MemoryRedisClient();
  });

  redisClient = realClient;
} catch (err) {
  logger.warn('Initializing in-memory store directly.');
  redisClient = new MemoryRedisClient();
}

// Ensure an instance is always ready synchronously
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new MemoryRedisClient();
  }
  return redisClient;
};

module.exports = {
  getRedisClient,
  redisClient
};
