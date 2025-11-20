const BaseModel = require('./BaseModel');

class StockLogModel extends BaseModel {
  constructor() {
    super('stock_logs');
  }

  async getLogsWithDetails(conditions = {}) {
    let query = `
      SELECT sl.*, p.product_name, u.full_name as user_name 
      FROM stock_logs sl 
      LEFT JOIN products p ON sl.product_id = p.product_id 
      LEFT JOIN users u ON sl.user_id = u.user_id 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (conditions.product_id) {
      query += ' AND sl.product_id = ?';
      params.push(conditions.product_id);
    }
    
    if (conditions.change_type) {
      query += ' AND sl.change_type = ?';
      params.push(conditions.change_type);
    }
    
    if (conditions.start_date && conditions.end_date) {
      query += ' AND sl.timestamp BETWEEN ? AND ?';
      params.push(conditions.start_date, conditions.end_date);
    }
    
    query += ' ORDER BY sl.timestamp DESC';
    
    return this.executeQuery(query, params);
  }
}

module.exports = new StockLogModel();