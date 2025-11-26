const { pool } = require('../db/connection');

class reportGenerator {
  
  // UR 3.2: Helper to calculate profit margin
  calculateProfitMargin(revenue, profit) {
    if (!revenue || revenue <= 0) return 0;
    return parseFloat(((profit / revenue) * 100).toFixed(2));
  }

  async generateDailyStats(dateStr) {
    // Aggregates revenue, counts, and calculated profit
    const query = `
      SELECT 
        COUNT(DISTINCT t.transaction_id) as total_transactions,
        SUM(t.total_amount) as total_revenue,
        SUM(ti.quantity) as items_sold,
        SUM(ti.quantity * (ti.unit_price - COALESCE(p.cost_price, 0))) as total_profit
      FROM transactions t
      JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.product_id
      WHERE DATE(t.transaction_date) = ? 
      AND t.status = 'Completed'
    `;

    const [stats] = await pool.execute(query, [dateStr]);
    const result = stats[0];

    const revenue = parseFloat(result.total_revenue || 0);
    const profit = parseFloat(result.total_profit || 0);
    const transactions = parseInt(result.total_transactions || 0);

    // Return object structured for the saveReport method
    return {
      report_type: 'Daily',
      period_start: dateStr,
      period_end: dateStr, // For daily, start and end are the same
      total_sales: revenue,
      total_transactions: transactions,
      data: {
        metrics: {
          items_sold: parseInt(result.items_sold || 0),
          profit: profit,
          margin_percent: this.calculateProfitMargin(revenue, profit)
        }
      }
    };
  }
}

module.exports = new reportGenerator();