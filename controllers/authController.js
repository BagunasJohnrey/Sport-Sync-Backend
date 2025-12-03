const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const auditLogModel = require('../models/auditLogModel');
const settingModel = require('../models/settingModel'); 
const { validationResult } = require('express-validator');

const authController = {

  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { username, password } = req.body;
      const user = await userModel.findByUsername(username);

      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      // Check Lockout
      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const waitMinutes = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
        return res.status(403).json({ success: false, message: `Account locked. Try again in ${waitMinutes} minutes.` });
      }

      // Verify Password
      const isValidPassword = await userModel.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        // 2. Fetch Dynamic Max Attempts
        const maxAttemptsVal = await settingModel.getValue('max_login_attempts');
        const maxAttempts = maxAttemptsVal ? parseInt(maxAttemptsVal) : 5; // Default to 5

        const attempts = (user.failed_login_attempts || 0) + 1;
        let updateData = { failed_login_attempts: attempts };

        if (attempts >= maxAttempts) {
          const lockTime = new Date(Date.now() + 15 * 60000); // 15 mins lock (could also be dynamic if needed)
          updateData.lockout_until = lockTime;
        }
        await userModel.update(user.user_id, updateData);

        return res.status(401).json({
          success: false,
          message: attempts >= maxAttempts 
            ? 'Account locked due to too many failed attempts.' 
            : `Invalid credentials. ${maxAttempts - attempts} attempts remaining.`
        });
      }

      // Successful Login
      if (user.failed_login_attempts > 0 || user.lockout_until) {
        await userModel.update(user.user_id, { failed_login_attempts: 0, lockout_until: null });
      }
      if (user.status !== 'Active') return res.status(401).json({ success: false, message: 'Account is inactive.' });

      await userModel.updateLastLogin(user.user_id);
      try { await auditLogModel.logAction(user.user_id, 'LOGIN', 'users', user.user_id); } catch (e) {}

      // 3. Fetch Dynamic Session Timeout
      const timeoutVal = await settingModel.getValue('session_timeout');
      const timeoutMins = timeoutVal ? parseInt(timeoutVal) : 30; // Default to 30 mins

      const accessToken = jwt.sign(
        { user_id: user.user_id, username: user.username, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: `${timeoutMins}m` } // Use dynamic timeout
      );

      // Refresh token logic
      const refreshToken = jwt.sign({ user_id: user.user_id }, process.env.REFRESH_TOKEN_SECRET || 'fallback', { expiresIn: '7d' });
      const refreshExpiresAt = new Date(); refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      await userModel.storeRefreshToken(user.user_id, refreshToken, refreshExpiresAt);

      res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 7 * 24 * 3600000 });
      const { password_hash, ...userSafe } = user;
      res.json({ success: true, message: 'Login successful', accessToken, user: userSafe });

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  refreshToken: async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.refresh_token) 
      return res.status(401).json({ success: false, message: 'No token provided' });

    const refreshToken = cookies.refresh_token;

    try {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || 'fallback_secret',
        async (err, decoded) => {
          if (err) 
            return res.status(403).json({ success: false, message: 'Invalid token signature' });

          const foundTokenRecord = await userModel.verifyRefreshToken(decoded.user_id, refreshToken);
          if (!foundTokenRecord) 
            return res.status(403).json({ success: false, message: 'Token not found or reused' });

          const user = await userModel.findById(decoded.user_id);
          if (!user) 
            return res.status(403).json({ success: false, message: 'User not found' });
          
          // Optional: Also use dynamic timeout for refresh token access token generation
          const timeoutVal = await settingModel.getValue('session_timeout');
          const timeoutMins = timeoutVal ? parseInt(timeoutVal) : 15;

          const accessToken = jwt.sign(
            {
              user_id: user.user_id,
              username: user.username,
              role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: `${timeoutMins}m` }
          );

          return res.json({ success: true, accessToken });
        }
      );
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  logout: async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.refresh_token) 
      return res.sendStatus(204);

    const refreshToken = cookies.refresh_token;
    
    const decoded = jwt.decode(refreshToken);
    if (decoded && decoded.user_id) {
        await userModel.deleteRefreshTokenForUser(decoded.user_id);
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'None',
      secure: true
    });

    res.json({ success: true, message: 'Logged out' });
  },

  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { full_name, username, password, role, email } = req.body;

      if (await userModel.findByUsername(username)) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
      if (await userModel.findByEmail(email)) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        full_name,
        username,
        password_hash: hashedPassword,
        role: role || 'Cashier',
        email,
        status: 'Active',
        created_at: new Date()
      };

      const newUser = await userModel.create(userData);
      const { password_hash, ...userResponse } = newUser;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: userResponse
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await userModel.findById(req.user.user_id);
      if (!user)
        return res.status(404).json({ success: false, message: 'User not found' });

      const { password_hash, ...userResponse } = user;
      res.json({ success: true, data: userResponse });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const userId = req.user.user_id;
      const { full_name, email } = req.body;

      const updateData = {};
      if (full_name) updateData.full_name = full_name;
      if (email) updateData.email = email;

      const updatedUser = await userModel.update(userId, updateData);
      const { password_hash, ...userResponse } = updatedUser;

      res.json({ success: true, message: 'Profile updated', data: userResponse });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const userId = req.user.user_id;
      const { current_password, new_password } = req.body;

      const user = await userModel.findById(userId);

      const isValidPassword = await userModel.verifyPassword(current_password, user.password_hash);
      if (!isValidPassword)
        return res.status(400).json({ success: false, message: 'Current password incorrect' });

      const newHashedPassword = await bcrypt.hash(new_password, 10);

      await userModel.update(userId, { password_hash: newHashedPassword });

      // Audit Log: Change Password
      try {
        await auditLogModel.logAction(userId, 'CHANGE_PASSWORD', 'users', userId);
      } catch (logError) {
        console.error('Failed to log password change:', logError);
      }

      res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  verifyToken: async (req, res) => {
    res.json({ success: true, message: 'Token is valid', user: req.user });
  }
};

module.exports = authController;