const Redis = require('ioredis');
const { REDIS_URL } = require('./env');
const logger = require('../utils/logger');

// In-Memory Fallback Store with TTL handling for local dev/test without Redis
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

  // Emulate Lua eval script executions atomically in-memory
  async eval(script, numKeys, ...keysAndArgs) {
    const keys = keysAndArgs.slice(0, numKeys);
    const args = keysAndArgs.slice(numKeys);

    // Multi-seat lock script emulation
    if (script.includes('cjson.decode') && script.includes('tonumber(ARGV[2])')) {
      const lockPayload = args[0];
      const ttlSeconds = parseInt(args[1], 10) || 600;
      const expectedUserId = String(args[2]);
      const expectedToken = args[3] ? String(args[3]) : null;

      // 1. Check all keys
      for (const key of keys) {
        const raw = this.store.get(key);
        if (raw) {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = { userId: raw };
          }
          if (parsed.userId !== expectedUserId && (!expectedToken || parsed.lockToken !== expectedToken)) {
            return 0; // Lock acquisition rejected
          }
        }
      }

      // 2. Lock all keys atomically
      for (const key of keys) {
        this.store.set(key, lockPayload);
        this.expire(key, ttlSeconds);
      }
      return 1;
    }

    // Atomic compare-and-delete script emulation
    if (script.includes('LUA_COMPARE_AND_DELETE_LOCK') || (script.includes('cjson.decode') && script.includes('deleted'))) {
      const token = args[0] ? String(args[0]) : null;
      const userId = args[1] ? String(args[1]) : null;
      let deleted = 0;

      for (const key of keys) {
        const raw = this.store.get(key);
        if (raw) {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = { userId: raw };
          }
          if ((token && parsed.lockToken === token) || (userId && parsed.userId === userId)) {
            if (this.timers.has(key)) {
              clearTimeout(this.timers.get(key));
              this.timers.delete(key);
            }
            this.store.delete(key);
            deleted++;
          }
        }
      }
      return deleted;
    }

    return 0;
  }
}

let redisClient;
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

if (isTest) {
  redisClient = new MemoryRedisClient();
} else {
  try {
    const realClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => (isProduction ? 2000 : null),
      connectTimeout: 2000,
      lazyConnect: true
    });

    realClient.connect()
      .then(() => {
        logger.info('Connected to Redis server successfully.');
        redisClient = realClient;
      })
      .catch((err) => {
        if (isProduction) {
          logger.error(`CRITICAL: Redis server connection failed in PRODUCTION (${err.message}). In-memory fallback is disabled in production.`);
          throw new Error(`Production Redis connection failed: ${err.message}`);
        } else {
          logger.warn(`Redis server not reachable (${err.message}). Using in-memory lock store for development.`);
          redisClient = new MemoryRedisClient();
        }
      });

    realClient.on('error', (err) => {
      if (isProduction) {
        logger.error(`CRITICAL: Production Redis connection error: ${err.message}`);
      } else {
        if (!redisClient || redisClient instanceof MemoryRedisClient) return;
        logger.warn(`Redis connection error (${err.message}). Falling back to in-memory store.`);
        redisClient = new MemoryRedisClient();
      }
    });

    redisClient = realClient;
  } catch (err) {
    if (isProduction) {
      throw err;
    }
    logger.warn('Initializing in-memory store directly.');
    redisClient = new MemoryRedisClient();
  }
}

const getRedisClient = () => {
  if (!redisClient) {
    if (isProduction) {
      throw new Error('Production Redis client is not initialized.');
    }
    redisClient = new MemoryRedisClient();
  }
  return redisClient;
};

module.exports = {
  getRedisClient,
  redisClient,
  MemoryRedisClient
};
