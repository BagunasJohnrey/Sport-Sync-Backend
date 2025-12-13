const cron = require('node-cron');
const automatedReportModel = require('../models/automatedReportModel');
const dailyReportJob = require('../services/scheduler/jobs/dailyReport');
const weeklyReportJob = require('../services/scheduler/jobs/weeklyReport');
const monthlyReportJob = require('../services/scheduler/jobs/monthlyReport'); 
const { logScheduler } = require('../utils/schedulerLogger');

// Map database 'report_type' strings to actual functions
const JOB_MAP = {
  'Daily': dailyReportJob,
  'Weekly': weeklyReportJob,
  'Monthly': monthlyReportJob
};

const initCron = () => {
  // 1. Environment Check
  if (process.env.ENABLE_CRON !== 'true') {
    console.log('🕒 Scheduler is disabled (ENABLE_CRON is not true).');
    return;
  }

  console.log('🚀 Initializing Dynamic Database Scheduler...');

  // 2. Poll Database Every Minute
  cron.schedule('* * * * *', async () => {
    try {
      // Find jobs that are due
      const dueReports = await automatedReportModel.findDueReports();

      if (dueReports.length > 0) {
        console.log(`🕒 Found ${dueReports.length} reports due for generation.`);
      }

      for (const schedule of dueReports) {
        const jobFunction = JOB_MAP[schedule.report_type];
        
        if (jobFunction) {
          logScheduler(schedule.report_type, 'START');
          
          try {
            // A. Determine Target Date (The scheduled time it SHOULD have run)
            // This ensures if server was down, we generate report for the correct past date
            const targetDate = new Date(schedule.next_run);

            // B. Run the Job (Pass the target date)
            await jobFunction(targetDate);
            
            // C. Calculate Next Run
            const nextRun = calculateNextRun(schedule.report_type);
            
            // D. Update Database
            await automatedReportModel.updateSchedule(schedule.schedule_id, nextRun);
            
            logScheduler(schedule.report_type, 'SUCCESS');
            console.log(`✅ Rescheduled ${schedule.report_type} to ${nextRun}`);
            
          } catch (err) {
            console.error(`❌ Failed to run ${schedule.report_type}:`, err);
            logScheduler(schedule.report_type, 'ERROR');
          }
        }
      }
    } catch (error) {
      console.error('❌ Scheduler Polling Error:', error);
    }
  });
};

// Helper to determine the next run date
const calculateNextRun = (type) => {
  const now = new Date();
  
  if (type === 'Daily') {
    now.setDate(now.getDate() + 1); // Add 1 day
    now.setHours(23, 59, 0, 0);     // Set to 23:59
  } 
  else if (type === 'Weekly') {
    now.setDate(now.getDate() + 7); // Add 7 days
    now.setHours(23, 59, 0, 0);
  } 
  else if (type === 'Monthly') {
    now.setMonth(now.getMonth() + 1); // Add 1 month
    now.setDate(1);                   // Set to 1st of month
    now.setHours(0, 0, 0, 0);
  }
  
  return now;
};

module.exports = initCron;