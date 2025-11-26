const BaseModel = require('./BaseModel');

class ReportModel extends BaseModel {
  constructor() {
    super('reports');
  }

  // Find report by type and start date
  async findByTypeAndDate(type, startDate) {
    const query = `SELECT * FROM reports WHERE report_type = ? AND period_start = ?`;
    const results = await this.executeQuery(query, [type, startDate]);
    return results[0] || null;
  }

  // Save report (Upsert logic)
  async saveReport(reportData) {
    const { 
      report_type, 
      period_start, 
      period_end, 
      generated_by, 
      total_sales, 
      total_transactions, 
      data 
    } = reportData;

    const existing = await this.findByTypeAndDate(report_type, period_start);
    const jsonData = JSON.stringify(data);

    if (existing) {
      // Update existing report
      await this.update(existing.report_id, {
        generated_by,
        total_sales,
        total_transactions,
        data: jsonData,
        created_at: new Date() // Update timestamp
      });
      return { report_id: existing.report_id, action: 'updated' };
    } else {
      // Create new report
      const result = await this.create({
        report_type,
        period_start,
        period_end,
        generated_by,
        total_sales,
        total_transactions,
        format: 'JSON', // Defaulting to JSON as per requirement
        data: jsonData,
        created_at: new Date()
      });
      return { report_id: result.id, action: 'created' };
    }
  }

  async getLatestReport(type) {
    const query = `
      SELECT * FROM reports 
      WHERE report_type = ? 
      ORDER BY period_start DESC 
      LIMIT 1
    `;
    const results = await this.executeQuery(query, [type]);
    return results[0] || null;
  }

  getPrimaryKey() {
    return 'report_id';
  }
}

module.exports = new ReportModel();