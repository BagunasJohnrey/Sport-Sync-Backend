// services/notificationService.js
const notificationModel = require('../models/notificationModel');

const notifyUser = async (userId, message, type, relatedId = null) => {
  try {
    await notificationModel.createNotification({
      userId,
      message,
      type,
      relatedId
    });
    console.log(`[Notification] Sent to User ${userId}: ${message}`);
  } catch (error) {
    console.error('[Notification Service Error]', error);
    // Swallow error so it doesn't crash the app
  }
};

module.exports = { notifyUser };