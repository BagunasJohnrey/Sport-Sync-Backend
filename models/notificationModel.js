const BaseModel = require('./BaseModel');

class NotificationModel extends BaseModel {
  constructor() {
    super('notifications');
  }

  async getUserNotifications(userId, status = null) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    return this.executeQuery(query, params);
  }

  async markAsRead(notificationId) {
    await this.executeQuery(
      'UPDATE notifications SET status = "Read" WHERE notification_id = ?',
      [notificationId]
    );
  }
}

module.exports = new NotificationModel();