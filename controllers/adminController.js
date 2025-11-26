const reportGenerator = require('../services/ReportGenerator');
const reportModel = require('../models/reportModel');
const auditLogModel = require('../models/auditLogModel');

const adminController = {
  triggerDailyReport: async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) return res.status(400).json({ message: 'Date is required' });

      // 1. Generate Stats
      const reportPayload = await reportGenerator.generateDailyStats(date);

      // 2. Add Admin ID (generated_by)
      reportPayload.generated_by = req.user.user_id;

      // 3. Save to DB
      await reportModel.saveReport(reportPayload);

      // 4. Log Action
      await auditLogModel.logAction(req.user.user_id, 'GENERATE_DAILY_REPORT', 'reports', 0);

      res.json({ success: true, data: reportPayload });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  triggerMonthlyReport: async (req, res) => {
    try {
      const { month } = req.body;
      if (!month) return res.status(400).json({ message: 'Month is required' });

      const reportPayload = await reportGenerator.generateMonthlyStats(month);
      
      // Add Admin ID
      reportPayload.generated_by = req.user.user_id;

      await reportModel.saveReport(reportPayload);

      await auditLogModel.logAction(req.user.user_id, 'GENERATE_MONTHLY_REPORT', 'reports', 0);

      res.json({ success: true, data: reportPayload });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminController;