const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireRole(['Admin']));

router.post('/trigger/daily', adminController.triggerDailyReport);
router.post('/trigger/monthly', adminController.triggerMonthlyReport);

module.exports = router;