const productModel = require('../models/productModel');
const { validationResult } = require('express-validator');

const productController = {
  // Get all products
  getAllProducts: async (req, res) => {
    try {
      const { page = 1, limit = 10, category_id, status, low_stock } = req.query;
      const offset = (page - 1) * limit;

      let conditions = {};
      if (category_id) conditions.category_id = category_id;
      if (status) conditions.status = status;

      let products;
      if (low_stock === 'true') {
        products = await productModel.getLowStockProducts();
      } else {
        products = await productModel.findAllWithCategory(conditions);
      }

      // Apply pagination manually for now
      const paginatedProducts = products.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: paginatedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: products.length,
          totalPages: Math.ceil(products.length / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getProductById: async (req, res) => {
    try {
      const products = await productModel.executeQuery(
        `SELECT p.*, pc.category_name 
       FROM products p 
       LEFT JOIN product_categories pc ON p.category_id = pc.category_id 
       WHERE p.product_id = ?`,
        [req.params.id]
      );

      const product = products[0];

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get product by barcode
  getProductByBarcode: async (req, res) => {
    try {
      const product = await productModel.findByBarcode(req.params.barcode);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Create new product
  createProduct: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        barcode,
        product_name,
        category_id,
        cost_price,
        selling_price,
        quantity,
        reorder_level,
        status
      } = req.body;

      // Check if barcode already exists
      const existingProduct = await productModel.findByBarcode(barcode);
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this barcode already exists'
        });
      }

      const productData = {
        barcode,
        product_name,
        category_id,
        cost_price: cost_price || 0,
        selling_price: selling_price || 0,
        quantity: quantity || 0,
        reorder_level: reorder_level || 5,
        status: status || 'Active',
        date_added: new Date(),
        last_updated: new Date()
      };

      const newProduct = await productModel.create(productData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: newProduct
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update product
  updateProduct: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const productId = req.params.id;
      const updateData = { ...req.body };
      updateData.last_updated = new Date();

      const updatedProduct = await productModel.update(productId, updateData);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update stock
  updateStock: async (req, res) => {
    try {
      const productId = req.params.id;
      const { quantity, change_type = 'Adjustment' } = req.body;
      const userId = req.user?.user_id || 1; // In real app, get from auth middleware

      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required'
        });
      }

      const result = await productModel.updateStock(productId, quantity, userId, change_type);

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete product
  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;

      // Check if product has transaction history
      const transactions = await productModel.executeQuery(
        'SELECT COUNT(*) as transaction_count FROM transaction_items WHERE product_id = ?',
        [productId]
      );

      if (transactions[0].transaction_count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete product with transaction history'
        });
      }

      await productModel.delete(productId);

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = productController;