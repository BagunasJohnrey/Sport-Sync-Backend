const reportGenerator = require('../../reportGenerator');
const reportModel = require('../../../models/reportModel');
const { logScheduler } = require('../../../utils/schedulerLogger');
const { notifyRole } = require('../../notificationService'); 
const userModel = require('../../../models/userModel'); 

// Accept targetDate (defaults to now if manually triggered without args)
const processDailyReport = async (targetDate = null) => {
  logScheduler('Daily Report', 'START');
   
  try {
    // 1. Determine Date (Use targetDate if provided, else Today)
    const dateObj = targetDate ? new Date(targetDate) : new Date();
    const dateStr = dateObj.toISOString().split('T')[0];
    console.log(`📊 Generating Daily Report for ${dateStr}...`);

    // 2. Generate Stats
    const reportPayload = await reportGenerator.generateDailyStats(dateStr);
    
    // 3. Find valid Admin ID (Fixes Foreign Key Error)
    const admins = await userModel.findAll({ role: 'Admin' });
    reportPayload.generated_by = admins.length > 0 ? admins[0].user_id : null; 

    // 4. Save to Database
    const savedResult = await reportModel.saveReport(reportPayload);

    // 5. Send Notification
    await notifyRole(
      'Admin', 
      `Daily Report for ${dateStr} has been generated successfully.`, 
      'SYSTEM', 
      savedResult.report_id
    );

    console.log(`✅ Daily Report Saved: ID ${savedResult.report_id}`);
    logScheduler('Daily Report', 'SUCCESS');
    
  } catch (error) {
    console.error('❌ Daily Report Error:', error);
    logScheduler('Daily Report', 'ERROR');
    throw error; // Re-throw so cron knows it failed
  }
};

module.exports = processDailyReport;