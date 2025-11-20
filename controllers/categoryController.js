const categoryModel = require('../models/categoryModel');
const { validationResult } = require('express-validator');

const categoryController = {
  // Get all categories
  getAllCategories: async (req, res) => {
    try {
      const { with_counts } = req.query;
      
      let categories;
      if (with_counts === 'true') {
        categories = await categoryModel.getCategoriesWithProductCount();
      } else {
        categories = await categoryModel.findAll();
      }
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get category by ID
  getCategoryById: async (req, res) => {
    try {
      const category = await categoryModel.findById(req.params.id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Create new category
  createCategory: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { category_name, description } = req.body;

      const categoryData = {
        category_name,
        description: description || null
      };

      const newCategory = await categoryModel.create(categoryData);
      
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: newCategory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update category
  updateCategory: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const categoryId = req.params.id;
      const { category_name, description } = req.body;
      
      const updateData = {};
      if (category_name) updateData.category_name = category_name;
      if (description !== undefined) updateData.description = description;

      const updatedCategory = await categoryModel.update(categoryId, updateData);
      
      res.json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete category
  deleteCategory: async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category has products
      const [products] = await categoryModel.executeQuery(
        'SELECT COUNT(*) as product_count FROM products WHERE category_id = ?',
        [categoryId]
      );
      
      if (products[0].product_count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing products'
        });
      }
      
      await categoryModel.delete(categoryId);
      
      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = categoryController;