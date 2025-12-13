const { pool } = require('../db/connection');

class reportGenerator {
  
  calculateProfitMargin(revenue, profit) {
    if (!revenue || revenue <= 0) return 0;
    return parseFloat(((profit / revenue) * 100).toFixed(2));
  }

  async generateDailyStats(dateStr) {
    console.log("⚡ CORRECT FILE LOADED - Generating Daily Report for:", dateStr); 

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

    // ✅ FIX: Generate the Name
    const reportName = `Daily Report - ${dateStr}`;
    console.log("⚡ REPORT NAME GENERATED:", reportName);

    return {
      report_type: 'Daily',
      file_path: reportName, // ✅ Sending name to Model
      period_start: dateStr,
      period_end: dateStr,
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

    const [stats] = await pool.execute(query, [startDateStr, endDateStr]);
    const result = stats[0];

    const reportName = `Weekly Report - ${startDateStr} to ${endDateStr}`;

    return {
      report_type: 'Weekly',
      file_path: reportName,
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

    const startDate = `${monthStr}-01`;
    const dateObj = new Date(startDate);
    const endDateObj = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0); 
    const endDate = endDateObj.toISOString().split('T')[0];

    const reportName = `Monthly Report - ${monthStr}`;

    return {
      report_type: 'Monthly',
      file_path: reportName,
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