// models/notificationModel.js
const BaseModel = require('./BaseModel');

class NotificationModel extends BaseModel {
  constructor() {
    super('notifications');
  }

  // Fetch notifications with pagination and unread counts
  async getUserNotifications(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Get Data
    const notifications = await this.executeQuery(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`, 
      [userId, limit, offset]
    );
    
    // Get Counts
    const [totalResult] = await this.executeQuery(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', 
      [userId]
    );
    const [unreadResult] = await this.executeQuery(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND status = "Unread"', 
      [userId]
    );

    return {
      notifications,
      total: totalResult ? totalResult.total : 0,
      unread: unreadResult ? unreadResult.unread : 0
    };
  }

  // Create a new notification
  async createNotification(data) {
    return this.create({
      user_id: data.userId,
      message: data.message,
      type: data.type || 'SYSTEM',
      related_id: data.relatedId || null, // This line requires the DB column to exist
      status: 'Unread',
      created_at: new Date()
    });
  }

  async markAsRead(notificationId) {
    return this.executeQuery(
      'UPDATE notifications SET status = "Read" WHERE notification_id = ?',
      [notificationId]
    );
  }

  async markAllAsRead(userId) {
    return this.executeQuery(
      'UPDATE notifications SET status = "Read" WHERE user_id = ? AND status = "Unread"',
      [userId]
    );
  }

  async deleteAllForUser(userId) {
    return this.executeQuery(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );
  }

  getPrimaryKey() {
    return 'notification_id';
  }
}

module.exports = new NotificationModel();