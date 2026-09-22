const connectDB = require('../config/db');
const { seedAllData } = require('./seedData');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const runSeed = async () => {
  try {
    await connectDB();
    await seedAllData();
    logger.info('Seeding finished. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  runSeed();
}
