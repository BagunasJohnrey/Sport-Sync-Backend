const auditLogModel = require('../models/auditLogModel');

const auditLogController = {
  getLogs: async (req, res) => {
    try {
      const { user_id, start_date, end_date } = req.query;
      
      const logs = await auditLogModel.getAuditTrail({ 
        user_id, 
        start_date, 
        end_date 
      });

      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = auditLogController;