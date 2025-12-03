const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireRole(['Admin']));

router.get('/', auditLogController.getLogs);

module.exports = router;