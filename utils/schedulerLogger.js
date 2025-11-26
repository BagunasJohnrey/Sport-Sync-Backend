const fs = require('fs');
const path = require('path');

// 1. Define the logs directory path (one level up from utils)
const logDir = path.join(__dirname, '../logs');

// 2. Ensure the logs directory exists; create it if missing
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir);
    console.log('Yz Created logs directory at:', logDir);
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

/**
 * Appends a log entry to the scheduler.log file.
 * @param {string} jobName - The name of the cron job (e.g., "Daily Report").
 * @param {string} status - The status of the execution (e.g., "START", "SUCCESS", "ERROR").
 */
const logScheduler = (jobName, status) => {
  const timestamp = new Date().toISOString();
  // Format: [2023-10-27T10:00:00.000Z] JOB: Daily Report | STATUS: START
  const logMessage = `[${timestamp}] JOB: ${jobName} | STATUS: ${status}\n`;
  const logFile = path.join(logDir, 'scheduler.log');

  // 3. Append the message to the file asynchronously
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('❌ Failed to write to scheduler log:', err);
    }
  });

  // 4. Also output to console for real-time visibility during development
  console.log(`📋 [Scheduler Log] ${jobName}: ${status}`);
};

module.exports = { logScheduler };