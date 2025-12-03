const BaseModel = require('./BaseModel');

class SettingModel extends BaseModel {
  constructor() {
    super('system_settings');
  }

  async getAllSettings() {
    const results = await this.executeQuery('SELECT * FROM system_settings');
    // Convert array to object for easier frontend access: { session_timeout: "30", ... }
    return results.reduce((acc, curr) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {});
  }

  async updateSetting(key, value) {
    // Uses INSERT ... ON DUPLICATE KEY UPDATE logic if the setting might not exist yet,
    // or standard UPDATE if you seeded the DB. Here is a safe UPSERT approach:
    return this.executeQuery(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at) 
       VALUES (?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [key, value, value]
    );
  }
  
  // Helper to get a single value easily in controllers (like authController)
  async getValue(key) {
      const res = await this.executeQuery('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
      return res[0] ? res[0].setting_value : null;
  }
  
  getPrimaryKey() { return 'setting_key'; }
}

module.exports = new SettingModel();