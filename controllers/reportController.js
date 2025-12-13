const reportModel = require('../models/reportModel');
const productModel = require('../models/productModel');
const settingModel = require('../models/settingModel');
const { pool } = require('../db/connection'); 
const { generatePDF } = require('../services/pdfService');
const { generateExcel } = require('../services/excelService');

const reportController = {
  // 1. Sales Dashboard Analytics
  getDashboardAnalytics: async (req, res) => {
    try {
      const { start_date, end_date, period = 'daily' } = req.query;
      const end = end_date || new Date().toISOString().split('T')[0];
      const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [kpis, trend, byCategory, paymentMethods, topProducts] = await Promise.all([
        reportModel.getSalesKPIs(start, end),
        reportModel.getSalesTrend(period, start, end),
        reportModel.getSalesByCategory(start, end),
        reportModel.getPaymentMethodStats(start, end),
        reportModel.getTopSellingProducts(start, end)
      ]);

      res.json({
        success: true,
        data: {
          summary: kpis,
          sales_trend: trend,
          sales_by_category: byCategory,
          payment_methods: paymentMethods,
          top_products: topProducts
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
      const criticalThresholdVal = await settingModel.getValue('stock_threshold_critical');
      const lowThresholdVal = await settingModel.getValue('stock_threshold_low');
      
      const criticalThreshold = criticalThresholdVal ? parseInt(criticalThresholdVal) : 10;
      const lowThreshold = lowThresholdVal ? parseInt(lowThresholdVal) : 20;

      const [summary, byCategory, lowStock] = await Promise.all([
        productModel.getInventorySummary(criticalThreshold, lowThreshold),
        productModel.getInventoryByCategory(),
        productModel.getLowStockProducts(criticalThreshold, lowThreshold)
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            ...summary,
            products_requiring_attention: lowStock
          },
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
    let connection;
    try {
      connection = await pool.getConnection();
      let dumpContent = "-- SportSync Database Backup\n";
      dumpContent += `-- Generated: ${new Date().toISOString()}\n\n`;
      dumpContent += "SET FOREIGN_KEY_CHECKS=0;\n\n";

      const [tables] = await connection.query('SHOW TABLES');
      const tableKey = Object.keys(tables[0])[0];

      for (const tableRow of tables) {
        const tableName = tableRow[tableKey];
        const [createResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
        const createSQL = createResult[0]['Create Table'];

        dumpContent += `-- Structure for table \`${tableName}\`\n`;
        dumpContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        dumpContent += `${createSQL};\n\n`;

        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
        
        if (rows.length > 0) {
            dumpContent += `-- Data for table \`${tableName}\`\n`;
            const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
            const values = rows.map(row => {
                const rowValues = Object.values(row).map(val => {
                    if (val === null) return 'NULL';
                    if (typeof val === 'number') return val;
                    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                }).join(', ');
                return `(${rowValues})`;
            }).join(',\n');

            dumpContent += `INSERT INTO \`${tableName}\` (${columns}) VALUES \n${values};\n\n`;
        }
      }

      dumpContent += "SET FOREIGN_KEY_CHECKS=1;\n";
      const fileName = `backup_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.sql`;
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(dumpContent);

    } catch (error) {
      console.error('Backup Generation Error:', error);
      res.status(500).json({ success: false, message: 'Backup generation failed: ' + error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  // 4. Profitability Analysis
  getProfitabilityAnalysis: async (req, res) => {
    try {
      const { start_date, end_date } = req.query; 
      const profitabilityData = await productModel.getProductProfitability(start_date, end_date);
      res.json({ success: true, data: profitabilityData });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 5. Download Report
  downloadReport: async (req, res) => {
    try {
      const { id, format } = req.query; 
      const report = await reportModel.findById(id);

      if (!report) return res.status(404).json({ message: 'Report not found' });

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
  },

  // --- NEW METHOD ---
  getReportHistory: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      const end = end_date || new Date().toISOString().split('T')[0];
      const start = start_date || new Date().toISOString().split('T')[0];

      // Calls the model which now filters for "Automated" reports only
      const reports = await reportModel.getReportHistory(start, end);

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('Report History Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = reportController;