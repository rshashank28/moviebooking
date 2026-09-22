const morgan = require('morgan');
const logger = require('../utils/logger');
const { NODE_ENV } = require('../config/env');

const stream = {
  write: (message) => logger.http(message.trim())
};

const skip = () => {
  return NODE_ENV === 'test';
};

const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

module.exports = requestLogger;
