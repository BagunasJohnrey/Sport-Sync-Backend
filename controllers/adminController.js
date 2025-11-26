const reportGenerator = require('../services/reportGenerator');
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
      // Ensure req.user exists (Auth middleware must be active)
      reportPayload.generated_by = req.user ? req.user.user_id : null; 

      // 3. Save to DB and CAPTURE the result
      const savedResult = await reportModel.saveReport(reportPayload);

      // 4. Merge ID into the response data
      const finalResponse = { 
        ...reportPayload, 
        report_id: savedResult.report_id,
        status: savedResult.action 
      };

      // 5. Log Action with the correct Report ID
      await auditLogModel.logAction(
        req.user ? req.user.user_id : 0, 
        'GENERATE_DAILY_REPORT', 
        'reports', 
        savedResult.report_id
      );

      res.json({ success: true, data: finalResponse });
    } catch (error) {
      console.error('Report Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  triggerMonthlyReport: async (req, res) => {
    try {
      const { month } = req.body;
      if (!month) return res.status(400).json({ message: 'Month is required' });

      const reportPayload = await reportGenerator.generateMonthlyStats(month);
      
      reportPayload.generated_by = req.user ? req.user.user_id : null;

      const savedResult = await reportModel.saveReport(reportPayload);

      const finalResponse = { 
        ...reportPayload, 
        report_id: savedResult.report_id,
        status: savedResult.action 
      };

      await auditLogModel.logAction(
        req.user ? req.user.user_id : 0, 
        'GENERATE_MONTHLY_REPORT', 
        'reports', 
        savedResult.report_id
      );

      res.json({ success: true, data: finalResponse });
    } catch (error) {
      console.error('Report Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminController;