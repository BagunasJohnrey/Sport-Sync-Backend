// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware.verifyToken);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markRead);
router.put('/read-all', notificationController.markAllRead);
router.delete('/', notificationController.clearAll);

module.exports = router;