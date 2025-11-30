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

    
  async generateWeeklyStats(endDateStr) {
    // Calculate start date (7 days ago)
    const end = new Date(endDateStr);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startDateStr = start.toISOString().split('T')[0];

    const query = `
      SELECT 
        COUNT(DISTINCT t.transaction_id) as total_transactions,
        SUM(t.total_amount) as total_revenue,
        SUM(ti.quantity) as items_sold
      FROM transactions t
      JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ? 
      AND t.status = 'Completed'
    `;

    const [stats] = await this.pool.execute(query, [startDateStr, endDateStr]);
    const result = stats[0];

    return {
      report_type: 'Weekly',
      period_start: startDateStr,
      period_end: endDateStr,
      total_sales: parseFloat(result.total_revenue || 0),
      total_transactions: parseInt(result.total_transactions || 0),
      data: {
        metrics: {
          items_sold: parseInt(result.items_sold || 0)
        }
      }
    };
  }

  async generateMonthlyStats(monthStr) {
    // monthStr format: 'YYYY-MM'
    const query = `
      SELECT 
        DATE(t.transaction_date) as day,
        COUNT(DISTINCT t.transaction_id) as daily_transactions,
        SUM(t.total_amount) as daily_revenue,
        SUM(ti.quantity * (ti.unit_price - COALESCE(p.cost_price, 0))) as daily_profit
      FROM transactions t
      JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.product_id
      WHERE DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
      AND t.status = 'Completed'
      GROUP BY DATE(t.transaction_date)
    `;

    const [dailyRows] = await pool.execute(query, [monthStr]);

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalTransactions = 0;

    dailyRows.forEach(row => {
      totalRevenue += parseFloat(row.daily_revenue || 0);
      totalProfit += parseFloat(row.daily_profit || 0);
      totalTransactions += parseInt(row.daily_transactions || 0);
    });

    // Calculate start and end dates for the table
    const startDate = `${monthStr}-01`;
    const dateObj = new Date(startDate);
    const endDateObj = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0); // Last day of month
    const endDate = endDateObj.toISOString().split('T')[0];

    return {
      report_type: 'Monthly',
      period_start: startDate,
      period_end: endDate,
      total_sales: totalRevenue,
      total_transactions: totalTransactions,
      data: {
        metrics: {
          total_profit: totalProfit,
          net_margin_percent: this.calculateProfitMargin(totalRevenue, totalProfit)
        },
        daily_breakdown: dailyRows
      }
    };
  }

}

module.exports = new reportGenerator();