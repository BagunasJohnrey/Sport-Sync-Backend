const transactionModel = require('../models/transactionModel');
const userModel = require('../models/userModel');
const settingModel = require('../models/settingModel'); 
const { validationResult } = require('express-validator');
const { notifyRole, notifyUser } = require('../services/notificationService');
const { generateReceiptPDF } = require('../services/receiptService');

const transactionController = {
  // Get all transactions
  getAllTransactions: async (req, res) => {
    try {
      const { page = 1, limit = 10, start_date, end_date, status } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT t.*, u.full_name as cashier_name 
        FROM transactions t 
        LEFT JOIN users u ON t.user_id = u.user_id 
        WHERE 1=1
      `;
      const params = [];
      
      // FIX: Use DATE() function for date filtering
      if (start_date && end_date) {
        query += ' AND DATE(t.transaction_date) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }
      
      if (status) {
        query += ' AND t.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const transactions = await transactionModel.executeQuery(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
      const countParams = [];
      
      if (start_date && end_date) {
        countQuery += ' AND DATE(transaction_date) BETWEEN ? AND ?';
        countParams.push(start_date, end_date);
      }
      
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      
      const countResult = await transactionModel.executeQuery(countQuery, countParams);
      const total = countResult[0].total;
      
      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get transaction by ID
  getTransactionById: async (req, res) => {
    try {
      const transaction = await transactionModel.getTransactionWithItems(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Create new transaction
  createTransaction: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { user_id, payment_method, total_amount, amount_paid, change_due, remarks, items } = req.body;

      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Transaction must have at least one item' });
      }

      // Check stock availability
      for (const item of items) {
        const products = await transactionModel.executeQuery(
          'SELECT product_id, quantity, product_name FROM products WHERE product_id = ?',
          [item.product_id]
        );
        
        if (products.length === 0) {
          return res.status(400).json({ success: false, message: `Product ID ${item.product_id} not found` });
        }
        
        const product = products[0];
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.product_name}. Available: ${product.quantity}`
          });
        }
      }

      // FIX 1: Normalize payment method to GCash
      let normalizedPaymentMethod = payment_method;
      if (payment_method === 'Mobile' || payment_method === 'mobile') {
        normalizedPaymentMethod = 'GCash';
      }

      // FIX 2: Create Transaction with status = 'Completed' and normalized payment method
      const transactionData = { 
          user_id, 
          payment_method: normalizedPaymentMethod, // Use normalized value
          total_amount, 
          amount_paid, 
          change_due: change_due || 0, 
          remarks,
          status: 'Completed' // Explicitly set status
      };
      
      const transactionId = await transactionModel.createTransaction(transactionData, items);
      
      // --- NOTIFICATION LOGIC ---
      
      // 1. Fetch Dynamic Thresholds
      const lowThresholdVal = await settingModel.getValue('stock_threshold_low');
      const criticalThresholdVal = await settingModel.getValue('stock_threshold_critical');
      const lowThreshold = lowThresholdVal ? parseInt(lowThresholdVal) : 20;
      const criticalThreshold = criticalThresholdVal ? parseInt(criticalThresholdVal) : 10;
      
      // 2. Check Low Stock for each item (Notify ALL Admins)
      const allUsers = await userModel.findAll(); 

      for (const item of items) {
        try {
          const products = await transactionModel.executeQuery(
            'SELECT product_name, quantity FROM products WHERE product_id = ?', 
            [item.product_id]
          );
          const product = products[0];
          
          if (product) {
             let message = '';
             let type = '';
             
             if (product.quantity <= criticalThreshold) {
                 message = `🚨 Critical Stock: ${product.product_name} dropped to ${product.quantity} units.`;
                 type = 'CRITICAL_STOCK';
             } else if (product.quantity <= lowThreshold) {
                 message = `⚠️ Low Stock: ${product.product_name} is at ${product.quantity} units.`;
                 type = 'LOW_STOCK';
             }

             if (message) {
               // Broadcast to all users
               for (const user of allUsers) {
                 await notifyUser(user.user_id, message, type, item.product_id);
               }
             }
          }
        } catch (err) {
          console.error('Notification trigger failed:', err);
        }
      }
      
      // 3. Check High Value Transaction
      if (total_amount >= 5000) {
         await notifyRole(
           'Admin',
           `High Value Sale: Transaction #${transactionId} for ₱${total_amount.toLocaleString()} recorded.`,
           'SALES',
           transactionId
         );
      }

      const newTransaction = await transactionModel.getTransactionWithItems(transactionId);
      
      res.status(201).json({
        success: true,
        message: 'Transaction completed successfully',
        data: newTransaction
      });

    } catch (error) {
      console.error('Transaction error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update transaction status
  updateTransactionStatus: async (req, res) => {
    try {
      const transactionId = req.params.id;
      const { status } = req.body;

      if (!['Completed', 'Cancelled', 'Refunded'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const updatedTransaction = await transactionModel.update(transactionId, { status });
      
      res.json({
        success: true,
        message: 'Transaction status updated successfully',
        data: updatedTransaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // FIX 3: Get sales report with proper status filtering
  getSalesReport: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }
  
      console.log(`📊 Generating sales report for ${start_date} to ${end_date}`);
  
      // FIX: Add status = 'Completed' filter
      const reportQuery = `
        SELECT 
          DATE(t.transaction_date) as date,
          COUNT(*) as transaction_count,
          SUM(t.total_amount) as total_sales,
          SUM(ti.quantity) as total_items_sold
        FROM transactions t
        LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.status = 'Completed'
        GROUP BY DATE(t.transaction_date)
        ORDER BY date
      `;
      
      const dailySales = await transactionModel.executeQuery(reportQuery, [start_date, end_date]);
      
      // FIX: Add status = 'Completed' filter to top products query
      const topProductsQuery = `
        SELECT 
          p.product_id,
          p.product_name,
          SUM(ti.quantity) as total_quantity,
          SUM(ti.total_price) as total_revenue
        FROM transaction_items ti
        LEFT JOIN products p ON ti.product_id = p.product_id
        LEFT JOIN transactions t ON ti.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.status = 'Completed'
        GROUP BY p.product_id, p.product_name
        ORDER BY total_quantity DESC
        LIMIT 10
      `;
      
      const topProducts = await transactionModel.executeQuery(topProductsQuery, [start_date, end_date]);
      
      const summary = {
        total_transactions: dailySales.reduce((sum, day) => sum + (day.transaction_count || 0), 0),
        total_sales: dailySales.reduce((sum, day) => sum + parseFloat(day.total_sales || 0), 0),
        total_items_sold: dailySales.reduce((sum, day) => sum + parseInt(day.total_items_sold || 0), 0)
      };
  
      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          daily_sales: dailySales,
          top_products: topProducts,
          summary: summary
        }
      });
    } catch (error) {
      console.error('❌ Sales report error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  downloadReceipt: async (req, res) => {
    try {
      const transaction = await transactionModel.getTransactionWithItems(req.params.id);
      if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
      
      generateReceiptPDF(transaction, res);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = transactionController;