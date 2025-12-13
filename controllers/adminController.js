const reportGenerator = require('../services/reportGenerator');
const reportModel = require('../models/reportModel');
const auditLogModel = require('../models/auditLogModel');
const { pool } = require('../db/connection');
const automatedReportModel = require('../models/automatedReportModel');

const adminController = {
  triggerDailyReport: async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) return res.status(400).json({ message: 'Date is required' });

      // Find valid Admin
      // Note: In manual trigger, req.user exists, so we use that.
      const reportPayload = await reportGenerator.generateDailyStats(date);
      reportPayload.generated_by = req.user ? req.user.user_id : null; 
      
      const savedResult = await reportModel.saveReport(reportPayload);
      
      const finalResponse = { 
        ...reportPayload, 
        report_id: savedResult.report_id,
        status: savedResult.action 
      };

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
  },

  // --- NEW: Scheduler Management for Test Dashboard ---
  
  getSchedules: async (req, res) => {
    try {
      const schedules = await automatedReportModel.findAll();
      res.json({ success: true, data: schedules });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  forceSchedule: async (req, res) => {
    try {
      const { report_type } = req.body;
      
      // Update DB to set 'next_run' to 1 minute ago so it triggers immediately
      await pool.execute(
        `UPDATE automated_reports_schedule 
          SET next_run = DATE_SUB(NOW(), INTERVAL 1 MINUTE), is_active = 1 
          WHERE report_type = ?`,
        [report_type]
      );
      
      res.json({ success: true, message: `${report_type} scheduled for immediate execution.` });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminController;