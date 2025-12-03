const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middleware/auth');

// Protect settings routes (Admin only)
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireRole(['Admin']));

router.get('/', settingController.getSettings);
router.put('/', settingController.updateSettings);

module.exports = router;