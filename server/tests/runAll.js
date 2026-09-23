const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
  'health.test.js',
  'auth.test.js',
  'catalog_venue.test.js',
  'seat_lock.test.js',
  'booking_payment.test.js',
  'refund_search_dashboard.test.js',
  'admin_organizer.test.js',
  'recommendation_ai.test.js'
];

console.log('================================================================');
console.log('  SHOWPULSE BACKEND FULL AUTOMATED TEST SUITE EXECUTION');
console.log('================================================================\n');

let passedSuites = 0;
let failedSuites = 0;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`\n================================================================`);
  console.log(`▶ Running Suite: ${file}`);
  console.log(`================================================================`);

  try {
    execSync(`node --test "${filePath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    passedSuites++;
    console.log(`\n✅ ${file} COMPLETED SUCCESSFULLY`);
  } catch (err) {
    failedSuites++;
    console.error(`\n❌ ${file} FAILED`);
  }
}

console.log('================================================================');
console.log(`TEST SUMMARY: ${passedSuites}/${testFiles.length} Suites Passed, ${failedSuites} Failed`);
console.log('================================================================');

if (failedSuites > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
