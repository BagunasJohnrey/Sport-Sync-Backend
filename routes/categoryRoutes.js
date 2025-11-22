const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

const categoryValidation = [
  body('category_name').notEmpty().withMessage('Category name is required')
];

// Apply authentication to all category routes
router.use(authMiddleware.verifyToken);

// View Categories - Admin, Staff, Cashier
router.get('/', 
  authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), 
  categoryController.getAllCategories
);

router.get('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), 
  categoryController.getCategoryById
);

// Manage Categories - Admin & Staff
router.post('/', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  categoryValidation, 
  categoryController.createCategory
);

router.put('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  categoryValidation, 
  categoryController.updateCategory
);

router.delete('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  categoryController.deleteCategory
);

module.exports = router;