// services/scheduler/jobs/weeklyReport.js
const reportGenerator = require('../../reportGenerator');
const reportModel = require('../../../models/reportModel');
const { logScheduler } = require('../../../utils/schedulerLogger');

const processWeeklyReport = async () => {
  logScheduler('Weekly Report', 'START');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const reportPayload = await reportGenerator.generateWeeklyStats(today);
    reportPayload.generated_by = 1;

    const savedResult = await reportModel.saveReport(reportPayload);
    
    console.log(`✅ Weekly Report Saved: ID ${savedResult.report_id}`);
    logScheduler('Weekly Report', 'SUCCESS');
  } catch (error) {
    console.error('❌ Weekly Report Error:', error);
    logScheduler('Weekly Report', 'ERROR');
  }
};

module.exports = processWeeklyReport;