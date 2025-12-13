const reportGenerator = require('../../reportGenerator');
const reportModel = require('../../../models/reportModel');
const userModel = require('../../../models/userModel'); 
const { logScheduler } = require('../../../utils/schedulerLogger');
const { notifyRole } = require('../../notificationService');

const processMonthlyReport = async (targetDate = null) => {
  logScheduler('Monthly Report', 'START');
  try {
    // Calculate target month based on execution date
    const date = targetDate ? new Date(targetDate) : new Date();
    
    // Move back 1 month to get the month we are reporting on
    date.setMonth(date.getMonth() - 1);
    const monthStr = date.toISOString().slice(0, 7); // "YYYY-MM"

    console.log(`📊 Generating Monthly Report for ${monthStr}...`);
    const reportPayload = await reportGenerator.generateMonthlyStats(monthStr);
    
    const admins = await userModel.findAll({ role: 'Admin' });
    reportPayload.generated_by = admins.length > 0 ? admins[0].user_id : null;

    const savedResult = await reportModel.saveReport(reportPayload);

    // Send Notification
    await notifyRole(
      'Admin', 
      `Monthly Report for ${monthStr} has been generated.`, 
      'SYSTEM', 
      savedResult.report_id
    );

    console.log(`✅ Monthly Report Saved: ID ${savedResult.report_id}`);
    logScheduler('Monthly Report', 'SUCCESS');
  } catch (error) {
    console.error('❌ Monthly Report Error:', error);
    logScheduler('Monthly Report', 'ERROR');
    throw error;
  }
};

module.exports = processMonthlyReport;