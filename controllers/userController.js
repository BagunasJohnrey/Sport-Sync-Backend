const userModel = require('../models/userModel');
const auditLogModel = require('../models/auditLogModel');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, role, status } = req.query;
      const offset = (page - 1) * limit;
      
      let conditions = {};
      if (role) conditions.role = role;
      if (status) conditions.status = status;
      
      const users = await userModel.findAll(conditions, parseInt(limit), offset);
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: users.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const user = await userModel.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { full_name, username, password, role, email, status } = req.body;
      
      // Check if username or email already exists
      const existingUser = await userModel.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        full_name,
        username,
        password_hash: hashedPassword,
        role: role || 'Cashier',
        email,
        status: status || 'Active',
        created_at: new Date()
      };

      const newUser = await userModel.create(userData);
      
      // Audit Log: Create User
      // req.user.user_id is the Admin performing the action
      // newUser.id is the new account ID (returned by BaseModel.create)
      try {
        await auditLogModel.logAction(req.user.user_id, 'CREATE_USER', 'users', newUser.id);
      } catch (auditError) {
        console.error('Failed to log create user action:', auditError);
      }

      // Remove password hash from response
      const { password_hash, ...userResponse } = newUser;
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = req.params.id;
      const { full_name, username, email, role, status } = req.body;
      
      const updateData = {};
      if (full_name) updateData.full_name = full_name;
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      updateData.last_updated = new Date();

      const updatedUser = await userModel.update(userId, updateData);
      
      // Audit Log: Update User
      try {
        await auditLogModel.logAction(req.user.user_id, 'UPDATE_USER', 'users', userId);
      } catch (auditError) {
        console.error('Failed to log update user action:', auditError);
      }

      // Remove password hash from response
      const { password_hash, ...userResponse } = updatedUser;
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      await userModel.delete(userId);

      // Audit Log: Delete User
      try {
        await auditLogModel.logAction(req.user.user_id, 'DELETE_USER', 'users', userId);
      } catch (auditError) {
        console.error('Failed to log delete user action:', auditError);
      }
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = userController;