// services/receiptService.js
const PDFDocument = require('pdfkit');

const generateReceiptPDF = (transaction, res) => {
  const doc = new PDFDocument({ size: [226, 400], margin: 10 }); // 80mm thermal paper size approx

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=receipt_${transaction.transaction_id}.pdf`);
  
  doc.pipe(res);

  // Store Header
  doc.fontSize(14).text('SportSync Store', { align: 'center' });
  doc.fontSize(8).text('123 Sports Avenue', { align: 'center' });
  doc.moveDown();

  // Transaction Info
  doc.text(`Date: ${new Date(transaction.transaction_date).toLocaleString()}`);
  doc.text(`Trans ID: #${transaction.transaction_id}`);
  doc.text(`Cashier: ${transaction.cashier_name || 'N/A'}`);
  doc.text('--------------------------------');

  // Items
  transaction.items.forEach(item => {
    doc.text(`${item.quantity}x ${item.product_name}`);
    doc.text(`   @${item.unit_price} = ${item.total_price}`, { align: 'right' });
  });

  doc.text('--------------------------------');
  doc.fontSize(12).text(`TOTAL: P${transaction.total_amount}`, { align: 'right', bold: true });
  
  doc.end();
};

module.exports = { generateReceiptPDF };