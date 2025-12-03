const productModel = require('../models/productModel');
const userModel = require('../models/userModel'); 
const auditLogModel = require('../models/auditLogModel');
const { validationResult } = require('express-validator');
const { notifyUser, notifyRole } = require('../services/notificationService');

const productController = {
  getAllProducts: async (req, res) => {
      try {
        const { page = 1, limit = 10, category_id, status, low_stock, search, sort_by } = req.query;
        const offset = (page - 1) * limit;
        let conditions = {};
        if (category_id) conditions.category_id = category_id;
        if (status) conditions.status = status;
        if (search) conditions.search = search;

        let products;
        if (low_stock === 'true') {
          products = await productModel.getLowStockProducts();
        } else {
          products = await productModel.findAllWithCategory(conditions, sort_by);
        }
        const paginatedProducts = products.slice(offset, offset + parseInt(limit));

        res.json({
          success: true,
          data: paginatedProducts,
          pagination: { page: parseInt(page), limit: parseInt(limit), total: products.length, totalPages: Math.ceil(products.length / limit) }
        });
      } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  getProductById: async (req, res) => {
      try {
        const products = await productModel.executeQuery(
          `SELECT p.*, pc.category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.product_id = ?`,
          [req.params.id]
        );
        if (!products[0]) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: products[0] });
      } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  getProductByBarcode: async (req, res) => {
       try {
        const product = await productModel.findByBarcode(req.params.barcode);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
      } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  createProduct: async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
        const { barcode, product_name, category_id, cost_price, selling_price, quantity, reorder_level, status } = req.body;
        const existingProduct = await productModel.findByBarcode(barcode);
        if (existingProduct) return res.status(400).json({ success: false, message: 'Product with this barcode already exists' });

        const newProduct = await productModel.create({
          barcode, product_name, category_id, cost_price: cost_price || 0, selling_price: selling_price || 0,
          quantity: quantity || 0, reorder_level: reorder_level || 5, status: status || 'Active',
          date_added: new Date(), last_updated: new Date()
        });
        try { await auditLogModel.logAction(req.user.user_id, 'CREATE_PRODUCT', 'products', newProduct.id); } catch (e) {}
        res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
      } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // Updated updateProduct method
  updateProduct: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const productId = req.params.id;
      const updateData = { ...req.body };
      updateData.last_updated = new Date();

      // Fetch old data to compare
      const oldProduct = await productModel.findById(productId);
      if (!oldProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Perform the update
      const updatedProduct = await productModel.update(productId, updateData);

      // Smart Contextual Logging & Notifications
      const userId = req.user.user_id;

      // --- NOTIFICATION: Price Change (Notify Staff) ---
      if (updateData.selling_price && updateData.selling_price != oldProduct.selling_price) {
        // Audit Log
        await auditLogModel.logAction(userId, `${oldProduct.product_name} SELLING_PRICE_CHANGE: ${oldProduct.selling_price} -> ${updateData.selling_price}`, 'products', productId);
        
        // Notify Staff
        await notifyRole(
          'Staff',
          `Price Update: ${oldProduct.product_name} changed from ₱${oldProduct.selling_price} to ₱${updateData.selling_price}.`,
          'INVENTORY',
          productId
        );
      }

      // Detect Cost Price Change
      if (updateData.cost_price && updateData.cost_price != oldProduct.cost_price) {
         await auditLogModel.logAction(userId, `${oldProduct.product_name} COST_PRICE_CHANGE: ${oldProduct.cost_price} -> ${updateData.cost_price}`, 'products', productId);
      }

      // Detect Quantity Change
      if (updateData.quantity && updateData.quantity != oldProduct.quantity) {
         await auditLogModel.logAction(userId, `${oldProduct.product_name} QUANTITY_CHANGE: ${oldProduct.quantity} -> ${updateData.quantity}`, 'products', productId);
      }

      // Detect Product Name Change
      if (updateData.product_name && updateData.product_name !== oldProduct.product_name) {
         await auditLogModel.logAction(userId, `NAME_CHANGE: ${oldProduct.product_name} -> ${updateData.product_name}`, 'products', productId);
      }

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update stock
  updateStock: async (req, res) => {
    try {
      const productId = req.params.id;
      const { quantity, change_type = 'Adjustment' } = req.body;
      const userId = req.user?.user_id || 1; 

      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ success: false, message: 'Valid quantity is required' });
      }

      const result = await productModel.updateStock(productId, quantity, userId, change_type);

      // Notification Logic
      try {
        const products = await productModel.executeQuery('SELECT * FROM products WHERE product_id = ?', [productId]);
        const updatedProduct = products[0];

        if (updatedProduct && updatedProduct.quantity <= updatedProduct.reorder_level) {
          const admins = await userModel.findAll({ role: 'Admin' });
          for (const admin of admins) {
              await notifyUser(
                  admin.user_id, 
                  `Low Stock Alert: ${updatedProduct.product_name} is down to ${updatedProduct.quantity} units.`,
                  'LOW_STOCK',
                  updatedProduct.product_id
              );
          }
        }
      } catch (err) {
        console.error('Failed to trigger notification:', err);
      }

      // --- NOTIFICATION: Stock Replenishment (Notify Staff) ---
      if (quantity > 0 && change_type !== 'Sale') { // Heuristic if explicit delta not returned
         const products = await productModel.executeQuery('SELECT product_name FROM products WHERE product_id = ?', [productId]);
         const prodName = products[0] ? products[0].product_name : 'Item';

         await notifyRole(
           'Staff',
           `Stock Replenished: ${prodName} stock updated to ${quantity}.`, // simplified message based on args available
           'INVENTORY',
           productId
         );
      }

      try {
        await auditLogModel.logAction(userId, 'UPDATE_STOCK', 'products', productId);
      } catch (auditError) {
        console.error('Failed to log stock update action:', auditError);
      }

      res.json({ success: true, message: 'Stock updated successfully', data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Delete product
  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const transactions = await productModel.executeQuery('SELECT COUNT(*) as transaction_count FROM transaction_items WHERE product_id = ?', [productId]);
      if (transactions[0].transaction_count > 0) return res.status(400).json({ success: false, message: 'Cannot delete product with transaction history' });
      await productModel.delete(productId);
      try { await auditLogModel.logAction(req.user.user_id, 'DELETE_PRODUCT', 'products', productId); } catch (e) {}
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }
};

module.exports = productController;