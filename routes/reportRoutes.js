const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.verifyToken);

// Sales Reports - Admin Only
router.get('/sales', authMiddleware.requireRole(['Admin']), reportController.getDashboardAnalytics);

// Inventory Reports - Admin & Staff
router.get('/inventory', authMiddleware.requireRole(['Admin', 'Staff']), reportController.getInventoryReport);

// Backup - Admin Only
router.get('/backup', authMiddleware.requireRole(['Admin']), reportController.exportDatabase);

module.exports = router;