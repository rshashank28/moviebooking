const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { CLIENT_URL } = require('../config/env');

let io = null;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    // Join show room for real-time seat lock updates
    socket.on('join_show', (showId) => {
      socket.join(`show:${showId}`);
      logger.debug(`Socket ${socket.id} joined room show:${showId}`);
    });

    socket.on('leave_show', (showId) => {
      socket.leave(`show:${showId}`);
      logger.debug(`Socket ${socket.id} left room show:${showId}`);
    });

    // Join user notification channel
    socket.on('join_user', (userId) => {
      socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined user channel user:${userId}`);
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
