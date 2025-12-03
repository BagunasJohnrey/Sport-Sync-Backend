const notificationModel = require('../models/notificationModel');
const userModel = require('../models/userModel'); 

const notifyUser = async (userId, message, type, relatedId = null) => {
  try {
    const safeType = (type || 'SYSTEM').toUpperCase();

    await notificationModel.createNotification({
      userId,
      message,
      type: safeType,
      relatedId
    });
    console.log(`[Notification] Sent to User ${userId}: ${message} [${safeType}]`);
  } catch (error) {
    console.error('[Notification Service Error]', error);
  }
};

const notifyRole = async (role, message, type, relatedId = null) => {
  try {
    const users = await userModel.findAll({ role });
    
    if (users.length === 0) {
        console.log(`[Notification] No users found with role: ${role}`);
        return;
    }

    for (const user of users) {
      await notifyUser(user.user_id, message, type, relatedId);
    }
    console.log(`[Notification] Broadcast sent to ${users.length} ${role}(s): ${message}`);
  } catch (error) {
    console.error(`[Notification Service] Failed to notify role ${role}:`, error);
  }
};

module.exports = { notifyUser, notifyRole };