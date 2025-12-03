const reportGenerator = require('../../reportGenerator');
const reportModel = require('../../../models/reportModel');
const { logScheduler } = require('../../../utils/schedulerLogger');
const { notifyRole } = require('../../notificationService'); 

const processDailyReport = async () => {
  logScheduler('Daily Report', 'START');
   
  try {
    // 1. Get Today's Date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    console.log(`📊 Generating Daily Report for ${today}...`);

    // 2. Generate Stats
    const reportPayload = await reportGenerator.generateDailyStats(today);
    
    // 3. System generated (User ID 0 or 1 for Admin)
    reportPayload.generated_by = 1; 

    // 4. Save to Database
    const savedResult = await reportModel.saveReport(reportPayload);

    // --- NOTIFICATION: Report Generated ---
    await notifyRole(
      'Admin', 
      `Daily Report for ${today} has been generated successfully.`, 
      'SYSTEM', 
      savedResult.report_id
    );

    console.log(`✅ Daily Report Saved: ID ${savedResult.report_id}`);
    logScheduler('Daily Report', 'SUCCESS');
    
  } catch (error) {
    console.error('❌ Daily Report Error:', error);
    logScheduler('Daily Report', 'ERROR');
  }
};

module.exports = processDailyReport;