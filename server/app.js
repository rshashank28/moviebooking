const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { PORT, CLIENT_URL } = require('./config/env');
const connectDB = require('./config/db');
const { getRedisClient } = require('./config/redis');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initSocketIO } = require('./sockets');
const apiRoutes = require('./routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Initialize Redis & DB
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}
getRedisClient();

// Security Headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api', limiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use(requestLogger);

// Mount API Routes
app.use('/api', apiRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ShowPulse API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  server.listen(PORT, () => {
    logger.info(`=================================================`);
    logger.info(`🚀 ShowPulse API Server running on port ${PORT}`);
    logger.info(`📡 Health check available at http://localhost:${PORT}/api/health`);
    logger.info(`⚡ WebSockets initialized & ready`);
    logger.info(`=================================================`);
  });
}

// Process Error Handlers
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  if (err.stack) logger.debug(err.stack);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  if (err.stack) logger.debug(err.stack);
  process.exit(1);
});

module.exports = { app, server };
