const reportModel = require('../models/reportModel');
const productModel = require('../models/productModel');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { generatePDF } = require('../services/pdfService');
const { generateExcel } = require('../services/excelService');


const reportController = {
  // 1. Sales Dashboard Analytics
  getDashboardAnalytics: async (req, res) => {
    try {
      const { start_date, end_date, period = 'daily' } = req.query;
      // Default to today if no end_date, and 30 days ago if no start_date
      const end = end_date || new Date().toISOString().split('T')[0];
      const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch all required data in parallel
      const [kpis, trend, byCategory, paymentMethods, topProducts] = await Promise.all([
        reportModel.getSalesKPIs(start, end),
        reportModel.getSalesTrend(period, start, end),
        reportModel.getSalesByCategory(start, end),
        reportModel.getPaymentMethodStats(start, end),
        reportModel.getTopSellingProducts(start, end) // Added: Fetch Top 10 Products
      ]);

      res.json({
        success: true,
        data: {
          summary: kpis,
          sales_trend: trend,        // Contains both revenue and volume data now
          sales_by_category: byCategory, // Contains both revenue and volume data now
          payment_methods: paymentMethods,
          top_products: topProducts  // Added: Top 10 products list
        }
      });
    } catch (error) {
      console.error('Dashboard Analytics Error:', error);
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
        success: true,
        data: {
          summary,
          inventory_by_category: byCategory,
          products_requiring_attention: lowStock
        }
      });
    } catch (error) {
      console.error('Inventory Report Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Database Backup
  exportDatabase: async (req, res) => {
    try {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
      const filePath = path.join(backupDir, fileName);

      // Construct mysqldump command
      // Note: Ensure mysqldump is in your system path or provide full path
      const cmd = `mysqldump -u ${process.env.DB_USER} --password=${process.env.DB_PASSWORD} --host=${process.env.DB_HOST} ${process.env.DB_NAME} > "${filePath}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('Backup generation error:', error);
          return res.status(500).json({ success: false, message: 'Backup generation failed' });
        }
        
        // Send file to client
        res.download(filePath, fileName, (err) => {
          if (err) {
            console.error('File download error:', err);
            // Don't try to send another response here as headers may be sent
          }
          
          // Optional: Delete backup file after download to save space
          // fs.unlink(filePath, (unlinkErr) => { if(unlinkErr) console.error(unlinkErr); });
        });
      });
    } catch (error) {
      console.error('Backup Controller Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // method to the reportController object
  getProfitabilityAnalysis: async (req, res) => {
    try {
      const profitabilityData = await productModel.getProductProfitability();
      res.json({ success: true, data: profitabilityData });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

};

// 4. Download Report
  downloadReport: async (req, res) => {
    try {
      const { id, format } = req.query; // format = 'pdf' or 'excel'
      const report = await reportModel.findById(id);

      if (!report) return res.status(404).json({ message: 'Report not found' });

      // Parse JSON data if stringified
      if (typeof report.data === 'string') {
        report.data = JSON.parse(report.data);
      }

      if (format === 'pdf') {
        return generatePDF(report, res);
      } else if (format === 'excel') {
        return generateExcel(report, res);
      } else {
        return res.status(400).json({ message: 'Invalid format. Use pdf or excel.' });
      }

    } catch (error) {
      console.error('Download Error:', error);
      res.status(500).json({ message: 'Download failed' });
    }
  };

module.exports = reportController;