const userModel = require('../models/userModel');
const auditLogModel = require('../models/auditLogModel');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { notifyRole } = require('../services/notificationService');

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, role, status, search } = req.query; 
      const parsedLimit = parseInt(limit);
      const parsedPage = parseInt(page);
      const offset = (parsedPage - 1) * parsedLimit;
      
      let conditions = {};
      if (role) conditions.role = role;
      if (status) conditions.status = status;
      if (search) conditions.search = search;

      const allMatchingUsers = await userModel.findAllUsersWithSearch(conditions); 
      
      const paginatedUsers = allMatchingUsers.slice(offset, offset + parsedLimit);
      const total = allMatchingUsers.length;

      res.json({
        success: true,
        data: paginatedUsers,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: total,
          totalPages: Math.ceil(total / parsedLimit)
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
      
      try {
        await auditLogModel.logAction(req.user.user_id, 'CREATE_USER', 'users', newUser.id);
      } catch (auditError) {
        console.error('Failed to log create user action:', auditError);
      }

      await notifyRole(
        'Admin', 
        `New user account created: ${username} (${role})`, 
        'SYSTEM', 
        newUser.id
      );

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
      
      try {
        await auditLogModel.logAction(req.user.user_id, 'UPDATE_USER', 'users', userId);
      } catch (auditError) {
        console.error('Failed to log update user action:', auditError);
      }

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

  // --- FIXED DELETE USER FUNCTION ---
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      try {
        // 1. Attempt Permanent Delete
        await userModel.delete(userId);

        try {
          await auditLogModel.logAction(req.user.user_id, 'DELETE_USER', 'users', userId);
        } catch (auditError) {}
        
        return res.json({
          success: true,
          message: 'User permanently deleted (no history found)'
        });

      } catch (dbError) {
        // 2. CHECK FOR FOREIGN KEY ERROR (Robust Check)
        // We check the error CODE or the error MESSAGE text
        const isForeignKeyError = 
            dbError.errno === 1451 || 
            dbError.code === 'ER_ROW_IS_REFERENCED_2' || 
            (dbError.message && dbError.message.includes('foreign key constraint fails'));

        if (isForeignKeyError) {
             
             // 3. Fallback: Soft Delete (Deactivate)
             await userModel.update(userId, { status: 'Inactive' });

             try {
               await auditLogModel.logAction(req.user.user_id, 'DEACTIVATE_USER', 'users', userId);
             } catch (auditError) {}

             return res.json({
               success: true,
               message: 'User deactivated successfully (history preserved)'
             });
        }

        // If it's a different error, re-throw it
        throw dbError;
      }

    } catch (error) {
      console.error('Delete User Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = userController;