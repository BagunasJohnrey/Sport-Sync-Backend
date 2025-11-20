const { pool } = require('../db/connection');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  async executeQuery(query, params = []) {
    try {
      const [results] = await this.pool.execute(query, params);
      return results;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findAll(conditions = {}, limit = null, offset = null) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }
    
    if (limit !== null) {
      query += ` LIMIT ?`;
      params.push(limit);
    }
    
    if (offset !== null) {
      query += ` OFFSET ?`;
      params.push(offset);
    }
    
    return this.executeQuery(query, params);
  }

  async findById(id) {
    const results = await this.executeQuery(
      `SELECT * FROM ${this.tableName} WHERE ${this.getPrimaryKey()} = ?`,
      [id]
    );
    return results[0] || null;
  }

  async create(data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const result = await this.executeQuery(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
      values
    );
    
    return { id: result.insertId, ...data };
  }

  async update(id, data) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    await this.executeQuery(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.getPrimaryKey()} = ?`,
      values
    );
    
    return this.findById(id);
  }

  async delete(id) {
    await this.executeQuery(
      `DELETE FROM ${this.tableName} WHERE ${this.getPrimaryKey()} = ?`,
      [id]
    );
    
    return { message: 'Record deleted successfully' };
  }

  getPrimaryKey() {
    // Define primary keys for each table
    const primaryKeys = {
      'users': 'user_id',
      'product_categories': 'category_id', 
      'products': 'product_id',
      'transactions': 'transaction_id',
      'transaction_items': 'item_id',
      'stock_logs': 'log_id',
      'notifications': 'notification_id',
      'audit_log': 'audit_id',
      'reports': 'report_id',
      'receipts': 'receipt_id',
      'automated_reports_schedule': 'schedule_id'
    };
    
    return primaryKeys[this.tableName] || `${this.tableName.split('_')[0]}_id`;
  }
}

module.exports = BaseModel;