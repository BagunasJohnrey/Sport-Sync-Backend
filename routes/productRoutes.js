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
  body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price is required')
];

// Loose Validation for Updating Products (Fields are optional)
const updateProductValidation = [
  body('barcode').optional().notEmpty(),
  body('product_name').optional().notEmpty(),
  body('category_id').optional().isInt({ min: 1 }),
  body('selling_price').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['Active', 'Inactive'])
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
  createProductValidation, // Use Strict Validation
  productController.createProduct
);

router.put('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  updateProductValidation, // Use New Optional Validation
  productController.updateProduct
);

router.patch('/:id/stock', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  productController.updateStock
);

router.delete('/:id', 
  authMiddleware.requireRole(['Admin']), 
  productController.deleteProduct
);

module.exports = router;