// services/excelService.js
const ExcelJS = require('exceljs');

const generateExcel = async (reportData, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  // Columns
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  // Title Row
  sheet.addRow([`SportSync ${reportData.report_type} Report`]);
  sheet.addRow([`Period: ${reportData.period_start} to ${reportData.period_end}`]);
  sheet.addRow([]); // Empty row

  // Main Data
  sheet.addRow(['Total Sales', reportData.total_sales]);
  sheet.addRow(['Total Transactions', reportData.total_transactions]);

  // Detailed Metrics
  if (reportData.data && reportData.data.metrics) {
    sheet.addRow([]);
    sheet.addRow(['Detailed Metrics']);
    Object.entries(reportData.data.metrics).forEach(([key, value]) => {
      sheet.addRow([key, value]);
    });
  }

  // Response
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { generateExcel };