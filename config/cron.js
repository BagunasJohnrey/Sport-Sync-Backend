const cron = require('node-cron');
const dailyReportJob = require('../services/scheduler/jobs/dailyReport');
const weeklyReportJob = require('../services/scheduler/jobs/weeklyReport');
const monthlyReportJob = require('../services/scheduler/jobs/monthlyReport'); 
const { logScheduler } = require('../utils/schedulerLogger');

const initCron = () => {
  // 1. ENVIRONMENT CHECK
  // Prevent the scheduler from running unless explicitly enabled.
  if (process.env.ENABLE_CRON !== 'true') {
    console.log('🕒 Scheduler is disabled (ENABLE_CRON is not true).');
    return;
  }

  console.log('🚀 Initializing Scheduler...');

  // 2. Daily Report Schedule (23:59 Daily)
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

  // 3. Weekly Report Schedule (23:59 Sunday)
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

// Monthly: 1st day of month at 00:00
  cron.schedule('0 0 1 * *', async () => {
    logScheduler('Monthly Report', 'START');
    try {
      await monthlyReportJob();
      logScheduler('Monthly Report', 'SUCCESS');
    } catch (error) {
      console.error('❌ Monthly Report Failed:', error);
      logScheduler('Monthly Report', 'ERROR');
    }
  });


module.exports = initCron;