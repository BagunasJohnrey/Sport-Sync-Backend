const reportModel = require('../models/reportModel');
const productModel = require('../models/productModel');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const reportController = {
  // 1. Sales Dashboard Analytics
  getDashboardAnalytics: async (req, res) => {
    try {
      const { start_date, end_date, period = 'daily' } = req.query;
      const end = end_date || new Date().toISOString().split('T')[0];
      const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [kpis, trend, byCategory, paymentMethods] = await Promise.all([
        reportModel.getSalesKPIs(start, end),
        reportModel.getSalesTrend(period, start, end),
        reportModel.getSalesByCategory(start, end),
        reportModel.getPaymentMethodStats(start, end)
      ]);

      res.json({
        success: true, data: { summary: kpis, sales_trend: trend, sales_by_category: byCategory, payment_methods: paymentMethods }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Inventory Report
  getInventoryReport: async (req, res) => {
    try {
      const [summary, byCategory, lowStock] = await Promise.all([
        productModel.getInventorySummary(),
        productModel.getInventoryByCategory(),
        productModel.getLowStockProducts()
      ]);

      res.json({
        success: true, data: { summary, inventory_by_category: byCategory, products_requiring_attention: lowStock }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Database Backup
  exportDatabase: async (req, res) => {
    try {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }
      const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
      const filePath = path.join(backupDir, fileName);

      const cmd = `mysqldump -u ${process.env.DB_USER} --password=${process.env.DB_PASSWORD} --host=${process.env.DB_HOST} ${process.env.DB_NAME} > "${filePath}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('Backup error:', error);
          return res.status(500).json({ success: false, message: 'Backup generation failed' });
        }
        res.download(filePath, fileName, (err) => {
          if (err) console.error(err);
        });
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
module.exports = reportController;