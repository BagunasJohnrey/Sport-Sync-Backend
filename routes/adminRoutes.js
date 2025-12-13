const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireRole(['Admin']));

// Manual Trigger
router.post('/trigger/daily', adminController.triggerDailyReport);
router.post('/trigger/monthly', adminController.triggerMonthlyReport);

// NEW: Scheduler Management
router.get('/schedules', adminController.getSchedules);
router.post('/schedules/force', adminController.forceSchedule);

module.exports = router;