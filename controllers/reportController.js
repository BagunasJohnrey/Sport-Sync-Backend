const reportModel = require('../models/reportModel');
const productModel = require('../models/productModel');
// 1. Import pool directly to run raw queries for backup
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
    let connection;
    try {
      connection = await pool.getConnection();
      let dumpContent = "-- SportSync Database Backup\n";
      dumpContent += `-- Generated: ${new Date().toISOString()}\n\n`;
      dumpContent += "SET FOREIGN_KEY_CHECKS=0;\n\n";

      // 1. Get all tables
      const [tables] = await connection.query('SHOW TABLES');
      
      // The key in the result object depends on DB name, so we grab the first value
      const tableKey = Object.keys(tables[0])[0];

      for (const tableRow of tables) {
        const tableName = tableRow[tableKey];

        // 2. Get Create Table Statement
        const [createResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
        const createSQL = createResult[0]['Create Table'];

        dumpContent += `-- Structure for table \`${tableName}\`\n`;
        dumpContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        dumpContent += `${createSQL};\n\n`;

        // 3. Get Table Data
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
        
        if (rows.length > 0) {
            dumpContent += `-- Data for table \`${tableName}\`\n`;
            
            // Get column names
            const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
            
            // Format values
            const values = rows.map(row => {
                const rowValues = Object.values(row).map(val => {
                    if (val === null) return 'NULL';
                    if (typeof val === 'number') return val;
                    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    // Escape single quotes for SQL
                    return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                }).join(', ');
                return `(${rowValues})`;
            }).join(',\n');

            dumpContent += `INSERT INTO \`${tableName}\` (${columns}) VALUES \n${values};\n\n`;
        }
      }

      dumpContent += "SET FOREIGN_KEY_CHECKS=1;\n";

      const fileName = `backup_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.sql`;
      
      // Send file download headers
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
      const profitabilityData = await productModel.getProductProfitability();
      res.json({ success: true, data: profitabilityData });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 5. Download Report
  downloadReport: async (req, res) => {
    try {
      const { id, format } = req.query; // format = 'pdf' or 'excel'
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
  }
};

module.exports = reportController;