// services/scheduler/jobs/monthlyReport.js
const reportGenerator = require('../../reportGenerator');
const reportModel = require('../../../models/reportModel');
const { logScheduler } = require('../../../utils/schedulerLogger');

const processMonthlyReport = async () => {
  logScheduler('Monthly Report', 'START');
  try {
    // Calculate previous month "YYYY-MM"
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const monthStr = date.toISOString().slice(0, 7); // "2023-10"

    const reportPayload = await reportGenerator.generateMonthlyStats(monthStr);
    reportPayload.generated_by = 1;

    const savedResult = await reportModel.saveReport(reportPayload);

    console.log(`✅ Monthly Report Saved: ID ${savedResult.report_id}`);
    logScheduler('Monthly Report', 'SUCCESS');
  } catch (error) {
    console.error('❌ Monthly Report Error:', error);
    logScheduler('Monthly Report', 'ERROR');
  }
};

module.exports = processMonthlyReport;