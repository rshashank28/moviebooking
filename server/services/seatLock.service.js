const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');
const ShowSeat = require('../models/ShowSeat');
const Show = require('../models/Show');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

const DEFAULT_LOCK_TTL = 600; // 10 minutes in seconds

// Redis Lua script for atomic multi-seat lock acquisition
// If any seat is already locked by another user/token, nothing is locked and 0 is returned
const LUA_ACQUIRE_MULTI_SEAT_LOCK = `
local lockPayload = ARGV[1]
local ttl = tonumber(ARGV[2])
local expectedUserId = ARGV[3]
local expectedToken = ARGV[4]

-- 1. Check all requested seat keys
for i, key in ipairs(KEYS) do
  local existing = redis.call('get', key)
  if existing then
    local data = cjson.decode(existing)
    if data.userId ~= expectedUserId and (not expectedToken or data.lockToken ~= expectedToken) then
      return 0 -- Conflict detected: abort without acquiring any locks
    end
  end
end

-- 2. Acquire locks on all keys atomically
for i, key in ipairs(KEYS) do
  redis.call('set', key, lockPayload, 'EX', ttl)
end

return 1
`;

// Redis Lua script for atomic compare-and-delete
// Deletes seat locks only if the lock ownership matches the provided token or userId
const LUA_COMPARE_AND_DELETE_LOCK = `
local token = ARGV[1]
local userId = ARGV[2]
local deleted = 0

for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  if val then
    local data = cjson.decode(val)
    if (token ~= '' and data.lockToken == token) or (userId ~= '' and data.userId == userId) then
      redis.call('del', key)
      deleted = deleted + 1
    end
  end
end

return deleted
`;

class SeatLockService {
  /**
   * Acquire atomic lock on multiple seats for a show
   */
  static async lockSeats(showId, seatIdentifiers, userId, ttlSeconds = DEFAULT_LOCK_TTL, lockToken = null) {
    if (!seatIdentifiers || !Array.isArray(seatIdentifiers) || seatIdentifiers.length === 0) {
      throw new Error('Please provide at least one seat to lock');
    }

    const redis = getRedisClient();
    const token = lockToken || crypto.randomBytes(16).toString('hex');
    const show = await Show.findById(showId);
    if (!show) {
      throw new Error('Show not found');
    }

    // 1. Verify availability against show-specific inventory (ShowSeat)
    const showSeats = await ShowSeat.find({
      show: showId,
      seatIdentifier: { $in: seatIdentifiers }
    });

    if (showSeats.length !== seatIdentifiers.length) {
      const foundIds = new Set(showSeats.map((s) => s.seatIdentifier));
      const missing = seatIdentifiers.filter((id) => !foundIds.has(id));
      throw new Error(`Seats not found in show inventory: ${missing.join(', ')}`);
    }

    const bookedSeat = showSeats.find((s) => s.status === 'BOOKED' || s.status === 'UNAVAILABLE');
    if (bookedSeat) {
      throw new Error(`Seat ${bookedSeat.seatIdentifier} has already been booked`);
    }

    // 2. Execute atomic Redis Lua script
    const lockKeys = seatIdentifiers.map((seatId) => `seat:lock:${showId}:${seatId}`);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const lockPayload = JSON.stringify({
      userId: userId.toString(),
      lockToken: token,
      showId: showId.toString(),
      seatIdentifiers,
      lockedAt: new Date().toISOString(),
      expiresAt
    });

    const lockResult = await redis.eval(
      LUA_ACQUIRE_MULTI_SEAT_LOCK,
      lockKeys.length,
      ...lockKeys,
      lockPayload,
      ttlSeconds,
      userId.toString(),
      token
    );

    if (lockResult !== 1) {
      throw new Error('One or more selected seats are currently held by another customer');
    }

    // 3. Update ShowSeat inventory documents
    await ShowSeat.updateMany(
      {
        show: showId,
        seatIdentifier: { $in: seatIdentifiers },
        status: { $ne: 'BOOKED' }
      },
      {
        status: 'LOCKED',
        lockedBy: userId.toString(),
        lockToken: token,
        lockedUntil: new Date(expiresAt)
      }
    );

    // 4. Broadcast WebSocket event to all clients viewing this show room
    try {
      const io = getIO();
      io.to(`show:${showId}`).emit('seats_locked', {
        showId,
        seatIdentifiers,
        lockedBy: userId.toString(),
        expiresAt
      });
    } catch (socketErr) {
      logger.debug(`Socket broadcast skipped: ${socketErr.message}`);
    }

    return {
      success: true,
      lockedSeats: seatIdentifiers,
      lockToken: token,
      expiresAt,
      ttlSeconds
    };
  }

  /**
   * Atomic unlock seats held by user or lock token
   */
  static async unlockSeats(showId, seatIdentifiers, userId, lockToken = '') {
    if (!seatIdentifiers || !Array.isArray(seatIdentifiers) || seatIdentifiers.length === 0) {
      return { success: true, unlockedSeats: [] };
    }

    const redis = getRedisClient();
    const lockKeys = seatIdentifiers.map((seatId) => `seat:lock:${showId}:${seatId}`);

    const deletedCount = await redis.eval(
      LUA_COMPARE_AND_DELETE_LOCK,
      lockKeys.length,
      ...lockKeys,
      lockToken || '',
      userId ? userId.toString() : ''
    );

    if (deletedCount > 0) {
      // Revert ShowSeat status back to AVAILABLE if not BOOKED
      await ShowSeat.updateMany(
        {
          show: showId,
          seatIdentifier: { $in: seatIdentifiers },
          status: 'LOCKED'
        },
        {
          status: 'AVAILABLE',
          lockedBy: null,
          lockToken: null,
          lockedUntil: null
        }
      );

      // Broadcast WebSocket unlock event
      try {
        const io = getIO();
        io.to(`show:${showId}`).emit('seats_unlocked', {
          showId,
          seatIdentifiers
        });
      } catch (socketErr) {
        logger.debug(`Socket broadcast skipped: ${socketErr.message}`);
      }
    }

    return {
      success: true,
      unlockedSeats: seatIdentifiers,
      deletedLocksCount: deletedCount
    };
  }

  /**
   * Verify that seats are actively and validly locked by the given user and session
   */
  static async verifyLockOwnership(showId, seatIdentifiers, userId, lockToken = null) {
    const redis = getRedisClient();

    for (const seatId of seatIdentifiers) {
      const key = `seat:lock:${showId}:${seatId}`;
      const lockRaw = await redis.get(key);

      if (!lockRaw) {
        // Fallback: check ShowSeat lockedUntil in DB
        const showSeat = await ShowSeat.findOne({
          show: showId,
          seatIdentifier: seatId
        });

        if (!showSeat || showSeat.status !== 'LOCKED' || !showSeat.lockedUntil || showSeat.lockedUntil < new Date()) {
          throw new Error(`Seat ${seatId} lock has expired or was not acquired. Please select seats again.`);
        }

        if (showSeat.lockedBy !== userId.toString() && (!lockToken || showSeat.lockToken !== lockToken)) {
          throw new Error(`Seat ${seatId} is locked by another session`);
        }
        continue;
      }

      let lockData;
      try {
        lockData = JSON.parse(lockRaw);
      } catch (e) {
        lockData = { userId: lockRaw };
      }

      if (lockData.userId !== userId.toString() && (!lockToken || lockData.lockToken !== lockToken)) {
        throw new Error(`Seat ${seatId} lock does not belong to your session`);
      }

      if (lockData.expiresAt && new Date(lockData.expiresAt) < new Date()) {
        throw new Error(`Seat ${seatId} lock has expired`);
      }
    }

    return { isValid: true };
  }

  /**
   * Get all currently active locks for a show
   */
  static async getActiveLocks(showId) {
    const redis = getRedisClient();
    const keys = await redis.keys(`seat:lock:${showId}:*`);
    const locks = {};

    for (const key of keys) {
      const parts = key.split(':');
      const seatIdentifier = parts[parts.length - 1];
      const raw = await redis.get(key);
      if (raw) {
        try {
          locks[seatIdentifier] = JSON.parse(raw);
        } catch (e) {
          locks[seatIdentifier] = { userId: raw };
        }
      }
    }

    return locks;
  }

  /**
   * Get array of locked seat identifier strings for a show
   */
  static async getLockedSeatsForShow(showId) {
    const locks = await this.getActiveLocks(showId);
    return Object.keys(locks);
  }
}

module.exports = SeatLockService;
