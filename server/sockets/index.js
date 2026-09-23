const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { CLIENT_URL } = require('../config/env');
const { verifyAccessToken } = require('../utils/jwt');

let io = null;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (token) {
        const decoded = verifyAccessToken(token);
        if (decoded) {
          socket.user = decoded;
        }
      }
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id} (User: ${socket.user?.id || 'Guest'})`);

    // If authenticated user, automatically join their verified personal notification room
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
      logger.debug(`Socket ${socket.id} automatically joined authenticated user channel: user:${socket.user.id}`);
    }

    // Join show room for real-time seat lock updates
    socket.on('join_show', (showId) => {
      if (showId && typeof showId === 'string') {
        socket.join(`show:${showId}`);
        logger.debug(`Socket ${socket.id} joined room show:${showId}`);
      }
    });

    socket.on('leave_show', (showId) => {
      if (showId && typeof showId === 'string') {
        socket.leave(`show:${showId}`);
        logger.debug(`Socket ${socket.id} left room show:${showId}`);
      }
    });

    // Secure join_user: Only allow joining own user channel if authenticated
    socket.on('join_user', (targetUserId) => {
      if (socket.user?.id && socket.user.id === targetUserId) {
        socket.join(`user:${socket.user.id}`);
      } else {
        logger.warn(`Unauthorized join_user attempt on socket ${socket.id} for target ${targetUserId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

module.exports = {
  initSocketIO,
  getIO
};
