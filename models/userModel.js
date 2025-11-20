const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');

class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  async create(userData) {
    // Hash password before saving
    if (userData.password_hash) {
      userData.password_hash = await bcrypt.hash(userData.password_hash, 10);
    }
    
    return super.create(userData);
  }

  async update(id, data) {
    // Hash password if it's being updated
    if (data.password_hash) {
      data.password_hash = await bcrypt.hash(data.password_hash, 10);
    }
    
    return super.update(id, data);
  }

  async findByUsername(username) {
    const results = await this.executeQuery(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return results[0] || null;
  }

  async findByEmail(email) {
    const results = await this.executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return results[0] || null;
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateLastLogin(userId) {
    await this.executeQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
  }

  // Override getPrimaryKey for users table
  getPrimaryKey() {
    return 'user_id';
  }
}

module.exports = new UserModel();