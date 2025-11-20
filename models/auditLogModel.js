const BaseModel = require('./BaseModel');

class AuditLogModel extends BaseModel {
  constructor() {
    super('audit_log');
  }

  async logAction(userId, action, tableName, recordId) {
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      timestamp: new Date()
    };
    
    return this.create(logData);
  }

  async getAuditTrail(conditions = {}) {
    let query = `
      SELECT al.*, u.full_name as user_name 
      FROM audit_log al 
      LEFT JOIN users u ON al.user_id = u.user_id 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (conditions.user_id) {
      query += ' AND al.user_id = ?';
      params.push(conditions.user_id);
    }
    
    if (conditions.table_name) {
      query += ' AND al.table_name = ?';
      params.push(conditions.table_name);
    }
    
    if (conditions.start_date && conditions.end_date) {
      query += ' AND al.timestamp BETWEEN ? AND ?';
      params.push(conditions.start_date, conditions.end_date);
    }
    
    query += ' ORDER BY al.timestamp DESC';
    
    return this.executeQuery(query, params);
  }
}

module.exports = new AuditLogModel();