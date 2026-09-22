const { getRedisClient } = require('../config/redis');
const Seat = require('../models/Seat');
const Show = require('../models/Show');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

const DEFAULT_LOCK_TTL = 600; // 10 minutes in seconds

class SeatLockService {
  /**
   * Acquire atomic lock on multiple seats for a show
   */
  static async lockSeats(showId, seatIdentifiers, userId, ttlSeconds = DEFAULT_LOCK_TTL) {
    const redis = getRedisClient();
    const lockKeys = seatIdentifiers.map((seatId) => `seat:lock:${showId}:${seatId}`);

    // Check if any seat is already booked in database
    const show = await Show.findById(showId);
    if (!show) {
      throw new Error('Show not found');
    }

    const seatsInDb = await Seat.find({
      screen: show.screen,
      seatIdentifier: { $in: seatIdentifiers }
    });

    const unavailableSeat = seatsInDb.find((s) => !s.isAvailable);
    if (unavailableSeat) {
      throw new Error(`Seat ${unavailableSeat.seatIdentifier} has already been booked`);
    }

    // Check if any seat is currently locked by someone else
    for (const key of lockKeys) {
      const existingLockRaw = await redis.get(key);
      if (existingLockRaw) {
        let lockData = null;
        try {
          lockData = JSON.parse(existingLockRaw);
        } catch (e) {
          lockData = { userId: existingLockRaw };
        }

        // If locked by another user, fail lock acquisition
        if (lockData.userId !== userId.toString()) {
          const seatId = key.split(':')[3];
          throw new Error(`Seat ${seatId} is currently held by another customer`);
        }
      }
    }

    // Atomically set all lock keys with TTL
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const lockPayload = JSON.stringify({
      userId: userId.toString(),
      showId: showId.toString(),
      lockedAt: new Date().toISOString(),
      expiresAt
    });

    for (const key of lockKeys) {
      await redis.set(key, lockPayload, 'EX', ttlSeconds);
    }

    // Broadcast WebSocket event to all clients viewing this show room
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
      expiresAt,
      ttlSeconds
    };
  }

  /**
   * Unlock seats held by user
   */
  static async unlockSeats(showId, seatIdentifiers, userId) {
    const redis = getRedisClient();
    const keysToDelete = [];

    for (const seatId of seatIdentifiers) {
      const key = `seat:lock:${showId}:${seatId}`;
      const lockRaw = await redis.get(key);
      if (lockRaw) {
        let lockData = null;
        try {
          lockData = JSON.parse(lockRaw);
        } catch (e) {
          lockData = { userId: lockRaw };
        }

        if (lockData.userId === userId.toString()) {
          keysToDelete.push(key);
        }
      }
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);

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
      unlockedSeats: seatIdentifiers
    };
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
