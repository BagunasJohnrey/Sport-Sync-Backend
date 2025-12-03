// controllers/notificationController.js
const notificationModel = require('../models/notificationModel');

const notificationController = {
  getNotifications: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      // Ensure your auth middleware attaches user_id to req.user
      const userId = req.user.user_id; 

      const result = await notificationModel.getUserNotifications(userId, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result.notifications,
        meta: {
          unreadCount: result.unread,
          totalPages: Math.ceil(result.total / limit),
          currentPage: parseInt(page)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  markRead: async (req, res) => {
    try {
      const { id } = req.params;
      await notificationModel.markAsRead(id);
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  markAllRead: async (req, res) => {
    try {
      const userId = req.user.user_id;
      await notificationModel.markAllAsRead(userId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  clearAll: async (req, res) => {
    try {
      const userId = req.user.user_id;
      await notificationModel.deleteAllForUser(userId);
      res.json({ success: true, message: 'All notifications cleared' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = notificationController;