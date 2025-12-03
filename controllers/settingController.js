const settingModel = require('../models/settingModel');

const settingController = {
  getSettings: async (req, res) => {
    try {
      const settings = await settingModel.getAllSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const updates = req.body; // Expects { session_timeout: 60, max_login_attempts: 5 }
      
      // Loop through each key in the body and update it
      const promises = Object.keys(updates).map(key => 
        settingModel.updateSetting(key, updates[key])
      );
      
      await Promise.all(promises);
      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = settingController;