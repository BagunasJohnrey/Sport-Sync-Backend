// services/pdfService.js
const PDFDocument = require('pdfkit');

const generatePDF = (reportData, res) => {
  const doc = new PDFDocument();
  
  // Set headers for download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report_${reportData.report_type}_${Date.now()}.pdf`);

  doc.pipe(res);

  // Title
  doc.fontSize(20).text(`SportSync ${reportData.report_type} Report`, { align: 'center' });
  doc.moveDown();

  // Meta Data
  doc.fontSize(12).text(`Period: ${reportData.period_start} to ${reportData.period_end}`);
  doc.text(`Total Sales: ₱${reportData.total_sales.toFixed(2)}`);
  doc.text(`Total Transactions: ${reportData.total_transactions}`);
  doc.moveDown();

  // JSON Data Dump (Simple implementation)
  doc.fontSize(10).text('Detailed Data:', { underline: true });
  doc.moveDown();
  
  // If data has metrics, list them
  if (reportData.data && reportData.data.metrics) {
    Object.entries(reportData.data.metrics).forEach(([key, value]) => {
       doc.text(`${key}: ${value}`);
    });
  }

  doc.end();
};

module.exports = { generatePDF };