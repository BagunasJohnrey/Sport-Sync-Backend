const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.verifyToken);

// Sales Reports - Admin Only
router.get('/sales', authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), reportController.getDashboardAnalytics);

// Inventory Reports - Admin & Staff
router.get('/inventory', authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), reportController.getInventoryReport);

// Backup - Admin Only
router.get('/backup', authMiddleware.requireRole(['Admin']), reportController.exportDatabase);

// Profitability
router.get('/profitability', authMiddleware.requireRole(['Admin', 'Staff']), reportController.getProfitabilityAnalysis);

// Download
router.get('/download', authMiddleware.requireRole(['Admin', 'Staff']), reportController.downloadReport);

// NEW: Report History for Automated Reports
router.get('/history', authMiddleware.requireRole(['Admin']), reportController.getReportHistory);

module.exports = router;