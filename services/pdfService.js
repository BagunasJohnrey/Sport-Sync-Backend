const PDFDocument = require('pdfkit');

// ✅ FIX: Robust Helper to format date string for DISPLAY (e.g. "Dec 13, 2025")
const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';

    let date;
    // If it's already a Date object (from DB), use it directly
    if (dateInput instanceof Date) {
        date = dateInput;
    } 
    // If it's a string (e.g., "2025-12-13"), convert it safely
    else {
        // Ensure we only have the YYYY-MM-DD part to prevent timezone shifts
        const cleanDateStr = typeof dateInput === 'string' ? dateInput.split('T')[0] : dateInput;
        date = new Date(cleanDateStr + 'T00:00:00');
    }

    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
};

// ✅ NEW: Helper to format date for FILENAME (e.g. "2025-12-13")
const formatForFilename = (dateInput) => {
    if (!dateInput) return 'unknown';
    // If it's a Date object, convert to ISO string first so we can split it
    const str = (dateInput instanceof Date) 
        ? dateInput.toISOString() 
        : String(dateInput);
    return str.split('T')[0]; // Returns YYYY-MM-DD
};

// Helper to draw a table (simple implementation for Daily Breakdown)
const drawTable = (doc, data, headers, yStart, xStart = 50) => {
    const tableTop = yStart;
    const rowHeight = 20;
    // Define column widths for Day, Transactions, Revenue, Profit
    const colWidths = [100, 100, 100, 100]; 

    let currentY = tableTop;

    // Draw Header
    doc.fillColor('#000')
       .fontSize(10)
       .font('Helvetica-Bold');
    
    headers.forEach((header, i) => {
        doc.text(header, xStart + colWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
            width: colWidths[i],
            align: i === 0 ? 'left' : 'right'
        });
    });
    currentY += rowHeight;

    // Draw Divider Line
    doc.lineWidth(0.5)
       .lineCap('butt')
       .strokeOpacity(0.5)
       .moveTo(xStart, currentY - 5)
       .lineTo(xStart + colWidths.reduce((a, b) => a + b, 0), currentY - 5)
       .stroke();
       
    currentY += 5;

    // Draw Rows
    doc.font('Helvetica')
       .strokeOpacity(1);
       
    data.forEach(row => {
        doc.fontSize(8);
        
        // Col 1: Day
        doc.text(formatDate(row.day), xStart, currentY, { width: colWidths[0], align: 'left' }); 
        
        // Col 2: Transactions
        doc.text(row.daily_transactions.toString(), xStart + colWidths[0], currentY, { width: colWidths[1], align: 'right' }); 
        
        // Col 3: Revenue (Formatted)
        doc.text(`₱${parseFloat(row.daily_revenue).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, xStart + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' }); 
        
        // Col 4: Profit (Formatted)
        doc.text(`₱${parseFloat(row.daily_profit).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, xStart + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[3], align: 'right' }); 

        currentY += rowHeight;
        
        // Handle page overflow for large tables
        if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
             doc.addPage();
             currentY = doc.page.margins.top;
             doc.font('Helvetica-Bold').fontSize(10).text('--- Continued ---', xStart, currentY);
             currentY += rowHeight * 2;
        }
    });
    
    return currentY; // Return final Y position
};

const generatePDF = (reportData, res) => {
    const doc = new PDFDocument({ margin: 50 }); // Set margins for cleaner look
    
    // --- ✅ NEW FILENAME LOGIC STARTS HERE ---
    let filenameDate = '';
    const start = formatForFilename(reportData.period_start);
    const end = formatForFilename(reportData.period_end);

    if (reportData.report_type === 'Daily') {
        // Example: Daily_Report_2025-12-13.pdf
        filenameDate = start;
    } else if (reportData.report_type === 'Monthly') {
        // Example: Monthly_Report_2025-12.pdf
        filenameDate = start.substring(0, 7); // Get YYYY-MM
    } else {
        // Example: Weekly_Report_2025-12-07_to_2025-12-13.pdf
        filenameDate = `${start}_to_${end}`;
    }

    const filename = `${reportData.report_type}_Report_${filenameDate}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    // Use quotes around filename to handle spaces safely
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // --- NEW FILENAME LOGIC ENDS HERE ---

    doc.pipe(res);

    // --- 1. HEADER & TITLE ---
    doc.fontSize(24)
       .fillColor('#0056b3') // Darker blue for professional look
       .text(`SPORT SYNC`, { align: 'center' });
    
    doc.fontSize(16)
       .fillColor('#000')
       .text(`${reportData.report_type} Sales Report`, { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .text(`Report Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, { align: 'center' });
    
    doc.moveDown(1.5);

    // --- 2. SUMMARY SECTION ---
    doc.fontSize(14)
       .text('I. Performance Summary', { underline: true });
    
    doc.moveDown(0.5);

    const periodStart = formatDate(reportData.period_start);
    const periodEnd = formatDate(reportData.period_end);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Reporting Period:', { continued: true })
       .font('Helvetica')
       .text(` ${periodStart} to ${periodEnd}`);
       
    doc.moveDown(0.5);

    // Use two columns for key metrics
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('Total Sales Revenue:', 50, doc.y, { continued: true, width: 250, align: 'left' })
       .font('Helvetica')
       .text(`₱${parseFloat(reportData.total_sales).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { width: 250, align: 'right' });
    
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('Total Transactions:', 50, doc.y, { continued: true, width: 250, align: 'left' })
       .font('Helvetica')
       .text(reportData.total_transactions.toLocaleString(), { width: 250, align: 'right' });
    
    doc.moveDown(1);
    
    // --- 3. DETAILED METRICS ---
    const metrics = reportData.data?.metrics;
    
    if (metrics) {
        doc.fontSize(14).font('Helvetica-Bold').text('II. Key Metrics', { underline: true });
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        Object.entries(metrics).forEach(([key, value]) => {
            let label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            let displayValue = value;
            
            // Format currency and percentages
            if (key.includes('profit')) {
                displayValue = `₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (key.includes('margin') || key.includes('percent')) {
                displayValue = `${parseFloat(value).toFixed(2)}%`;
            } else if (typeof value === 'number') {
                displayValue = value.toLocaleString();
            }

            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text(`${label}:`, { continued: true, width: 250, align: 'left' })
               .font('Helvetica')
               .text(displayValue, { width: 250, align: 'right' });
            doc.moveDown(0.2);
        });
        doc.moveDown(1);
    }

    // --- 4. DAILY BREAKDOWN (For Monthly Reports) ---
    const dailyBreakdown = reportData.data?.daily_breakdown;
    if (dailyBreakdown && dailyBreakdown.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('III. Daily Breakdown', { underline: true });
        doc.moveDown(0.5);
        
        const headers = ['Date', 'Transactions', 'Revenue', 'Profit'];
        drawTable(doc, dailyBreakdown, headers, doc.y, 50);
    }

    doc.end();
};

module.exports = { generatePDF };