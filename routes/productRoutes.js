const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

// Strict Validation for Creating Products (All fields required)
const createProductValidation = [
  body('barcode').notEmpty().withMessage('Barcode is required'),
  body('product_name').notEmpty().withMessage('Product name is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('selling_price').isFloat({ gt: 0 }).withMessage('Selling price must be greater than 0'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price cannot be negative'),
  // [UPDATED] Enforce strictly greater than 0 (min: 1) and make it required
  body('quantity').isInt({ min: 1 }).withMessage('Initial stock must be greater than 0')
];

// Loose Validation for Updating Products (Fields are optional)
const updateProductValidation = [
  body('barcode').optional().notEmpty(),
  body('product_name').optional().notEmpty(),
  body('category_id').optional().isInt({ min: 1 }),
  body('selling_price').optional().isFloat({ gt: 0 }).withMessage('Selling price must be greater than 0'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price cannot be negative'),
  // [UPDATED] Enforce strictly greater than 0 if provided
  body('quantity').optional().isInt({ min: 1 }).withMessage('Stock must be greater than 0'),
  body('status').optional().isIn(['Active', 'Archived'])
];

// Validation for Stock Updates
const stockUpdateValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('Stock quantity must be greater than 0')
];

// Apply authentication
router.use(authMiddleware.verifyToken);

// View Products
router.get('/', 
  authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), 
  productController.getAllProducts
);

router.get('/barcode/:barcode', 
  authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), 
  productController.getProductByBarcode
);

router.get('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff', 'Cashier']), 
  productController.getProductById
);

// Manage Products
router.post('/', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  createProductValidation, 
  productController.createProduct
);

router.put('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  updateProductValidation, 
  productController.updateProduct
);

// [UPDATED] Applied validation to stock patch
router.patch('/:id/stock', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  stockUpdateValidation,
  productController.updateStock
);

router.delete('/:id', 
  authMiddleware.requireRole(['Admin']), 
  productController.deleteProduct
);

module.exports = router;