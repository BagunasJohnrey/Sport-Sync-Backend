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

  //  Sales Report Methods 
async getSalesKPIs(startDate, endDate) {
  const query = `
    SELECT
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COUNT(transaction_id) as total_transactions,
      COALESCE(AVG(total_amount), 0) as average_transaction_value,
      (SELECT payment_method FROM transactions
        WHERE status = 'Completed' AND transaction_date BETWEEN ? AND ?
        GROUP BY payment_method ORDER BY COUNT(*) DESC LIMIT 1) as top_payment_method
    FROM transactions
    WHERE status = 'Completed'
    AND transaction_date BETWEEN ? AND ?
  `;
  const result = await this.executeQuery(query, [startDate, endDate, startDate, endDate]);
  return result[0];
}

async getSalesTrend(period, startDate, endDate) {
  let dateFormat;
  switch(period) {
    case 'monthly': dateFormat = '%Y-%m'; break;
    case 'weekly':  dateFormat = '%Y-W%u'; break;
    default:        dateFormat = '%Y-%m-%d'; // daily
  }
  const query = `
    SELECT
      DATE_FORMAT(transaction_date, '${dateFormat}') as date_label,
      SUM(total_amount) as total_sales
    FROM transactions
    WHERE status = 'Completed'
    AND transaction_date BETWEEN ? AND ?
    GROUP BY date_label
    ORDER BY date_label ASC
  `;
  return this.executeQuery(query, [startDate, endDate]);
}

async getSalesByCategory(startDate, endDate) {
  const query = `
    SELECT
      pc.category_name,
      SUM(ti.total_price) as total_revenue
    FROM transaction_items ti
    JOIN products p ON ti.product_id = p.product_id
    JOIN product_categories pc ON p.category_id = pc.category_id
    JOIN transactions t ON ti.transaction_id = t.transaction_id
    WHERE t.status = 'Completed'
    AND t.transaction_date BETWEEN ? AND ?
    GROUP BY pc.category_id
  `;
  return this.executeQuery(query, [startDate, endDate]);
}

async getPaymentMethodStats(startDate, endDate) {
  const query = `
    SELECT
      payment_method,
      COUNT(*) as usage_count
    FROM transactions
    WHERE status = 'Completed'
    AND transaction_date BETWEEN ? AND ?
    GROUP BY payment_method
  `;
  return this.executeQuery(query, [startDate, endDate]);
}

async getSalesKPIs(startDate, endDate) {
    const query = `
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(transaction_id) as total_transactions,
        COALESCE(AVG(total_amount), 0) as average_transaction_value,
        (SELECT payment_method FROM transactions
          WHERE status = 'Completed' AND transaction_date BETWEEN ? AND ?
          GROUP BY payment_method ORDER BY COUNT(*) DESC LIMIT 1) as top_payment_method
      FROM transactions
      WHERE status = 'Completed'
      AND transaction_date BETWEEN ? AND ?
    `;
    const result = await this.executeQuery(query, [startDate, endDate, startDate, endDate]);
    return result[0];
  }

  async getSalesTrend(period, startDate, endDate) {
    let dateFormat;
    switch(period) {
      case 'monthly': dateFormat = '%Y-%m'; break;
      case 'weekly':  dateFormat = '%Y-W%u'; break;
      default:        dateFormat = '%Y-%m-%d'; // daily
    }
    // Updated to return both Revenue (total_amount) and Volume (count)
    const query = `
      SELECT
        DATE_FORMAT(transaction_date, '${dateFormat}') as date_label,
        SUM(total_amount) as total_revenue,
        COUNT(*) as total_sales_count
      FROM transactions
      WHERE status = 'Completed'
      AND transaction_date BETWEEN ? AND ?
      GROUP BY date_label
      ORDER BY date_label ASC
    `;
    return this.executeQuery(query, [startDate, endDate]);
  }

  async getSalesByCategory(startDate, endDate) {
    // Updated to return both Revenue (price) and Volume (quantity)
    const query = `
      SELECT
        pc.category_name,
        SUM(ti.total_price) as total_revenue,
        SUM(ti.quantity) as total_volume
      FROM transaction_items ti
      JOIN products p ON ti.product_id = p.product_id
      JOIN product_categories pc ON p.category_id = pc.category_id
      JOIN transactions t ON ti.transaction_id = t.transaction_id
      WHERE t.status = 'Completed'
      AND t.transaction_date BETWEEN ? AND ?
      GROUP BY pc.category_id
    `;
    return this.executeQuery(query, [startDate, endDate]);
  }

  async getPaymentMethodStats(startDate, endDate) {
    const query = `
      SELECT
        payment_method,
        COUNT(*) as usage_count
      FROM transactions
      WHERE status = 'Completed'
      AND transaction_date BETWEEN ? AND ?
      GROUP BY payment_method
    `;
    return this.executeQuery(query, [startDate, endDate]);
  }

  // New method for Top 10 Products
  async getTopSellingProducts(startDate, endDate) {
    const query = `
      SELECT
        p.product_name,
        SUM(ti.quantity) as total_sold,
        SUM(ti.total_price) as total_revenue
      FROM transaction_items ti
      JOIN products p ON ti.product_id = p.product_id
      JOIN transactions t ON ti.transaction_id = t.transaction_id
      WHERE t.status = 'Completed'
      AND t.transaction_date BETWEEN ? AND ?
      GROUP BY p.product_id
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    return this.executeQuery(query, [startDate, endDate]);
  }

  getPrimaryKey() {
    return 'report_id';
  }
}

module.exports = new ReportModel();