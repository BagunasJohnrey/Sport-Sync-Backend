const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');

class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  // --- NEW METHOD FOR DYNAMIC SEARCH AND FILTERING ---
  async findAllUsersWithSearch(conditions = {}) {
    // Select all user fields except the sensitive password hash
    let query = `SELECT user_id, full_name, username, email, role, status, created_at, last_login, last_updated 
                 FROM ${this.tableName}`;
    const params = [];
    const whereClauses = [];

    const { search, role, status } = conditions;
    
    // Standard Filters
    if (role) {
      whereClauses.push(`role = ?`);
      params.push(role);
    }
    if (status) {
      whereClauses.push(`status = ?`);
      params.push(status);
    }
    
    // Dynamic Search Logic (full_name, username, email)
    if (search) {
      whereClauses.push('(full_name LIKE ? OR username LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      // Push the search term three times for the three fields in the OR clause
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // Default sorting
    query += ` ORDER BY full_name ASC`;

    // Note: The controller handles pagination on the result set.
    return this.executeQuery(query, params);
  }
  // --- END NEW METHOD ---

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

  async storeRefreshToken(userId, token, expiresAt) {
    const hashedToken = await bcrypt.hash(token, 10);
    await this.executeQuery(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, hashedToken, expiresAt]
    );
  }

  async verifyRefreshToken(userId, plainToken) {
    const results = await this.executeQuery(
      `SELECT rt.*, u.role, u.username 
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.user_id
       WHERE rt.user_id = ? AND rt.expires_at > NOW()`,
      [userId]
    );

    for (const record of results) {
      const isMatch = await bcrypt.compare(plainToken, record.token);
      if (isMatch) return record;
    }
    
    return null;
  }

  async deleteRefreshTokenForUser(userId) {
    await this.deleteAllUserTokens(userId);
  }

  async deleteAllUserTokens(userId) {
    await this.executeQuery(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );
  }

  getPrimaryKey() {
    return 'user_id';
  }
}

module.exports = new UserModel();