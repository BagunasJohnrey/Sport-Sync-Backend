const cron = require('node-cron');
const dailyReportJob = require('../services/scheduler/jobs/dailyReport');
const weeklyReportJob = require('../services/scheduler/jobs/weeklyReport');
const { logScheduler } = require('../utils/schedulerLogger');

const initCron = () => {
  console.log('🚀 Initializing Scheduler...');

  // =================================================================
  // 1. Daily Report Schedule
  // Timing: 23:59 (11:59 PM) every day
  // Cron Syntax: Minute(59) Hour(23) Day(*) Month(*) DayOfWeek(*)
  // =================================================================
  cron.schedule('59 23 * * *', async () => {
    logScheduler('Daily Report', 'START');
    try {
      await dailyReportJob();
      logScheduler('Daily Report', 'SUCCESS');
    } catch (error) {
      console.error('❌ Daily Report Failed:', error);
      logScheduler('Daily Report', 'ERROR');
    }
  });

  // =================================================================
  // 2. Weekly Report Schedule
  // Timing: 23:59 (11:59 PM) every Sunday
  // Cron Syntax: Minute(59) Hour(23) Day(*) Month(*) DayOfWeek(0=Sun)
  // =================================================================
  cron.schedule('59 23 * * 0', async () => {
    logScheduler('Weekly Report', 'START');
    try {
      await weeklyReportJob();
      logScheduler('Weekly Report', 'SUCCESS');
    } catch (error) {
      console.error('❌ Weekly Report Failed:', error);
      logScheduler('Weekly Report', 'ERROR');
    }
  });
};

module.exports = initCron;