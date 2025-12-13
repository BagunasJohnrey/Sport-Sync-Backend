const reportGenerator = require('../../reportGenerator');
const reportModel = require('../../../models/reportModel');
const userModel = require('../../../models/userModel'); 
const { logScheduler } = require('../../../utils/schedulerLogger');
const { notifyRole } = require('../../notificationService');

const processWeeklyReport = async (targetDate = null) => {
  logScheduler('Weekly Report', 'START');
  try {
    const dateObj = targetDate ? new Date(targetDate) : new Date();
    const dateStr = dateObj.toISOString().split('T')[0];
    
    console.log(`📊 Generating Weekly Report ending ${dateStr}...`);
    const reportPayload = await reportGenerator.generateWeeklyStats(dateStr);
    
    // Find valid Admin ID
    const admins = await userModel.findAll({ role: 'Admin' });
    reportPayload.generated_by = admins.length > 0 ? admins[0].user_id : null;

    const savedResult = await reportModel.saveReport(reportPayload);
    
    // Send Notification
    await notifyRole(
      'Admin', 
      `Weekly Report ending ${dateStr} has been generated.`, 
      'SYSTEM', 
      savedResult.report_id
    );

    console.log(`✅ Weekly Report Saved: ID ${savedResult.report_id}`);
    logScheduler('Weekly Report', 'SUCCESS');
  } catch (error) {
    console.error('❌ Weekly Report Error:', error);
    logScheduler('Weekly Report', 'ERROR');
    throw error;
  }
};

module.exports = processWeeklyReport;