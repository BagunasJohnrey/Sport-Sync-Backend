const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

const productValidation = [
  body('barcode').notEmpty().withMessage('Barcode is required'),
  body('product_name').notEmpty().withMessage('Product name is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price is required')
];

// Apply authentication
router.use(authMiddleware.verifyToken);

// View Products - Open to Admin, Staff, and Cashier
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

// Manage Products - Admin & Staff (Staff can edit stocks/inventory)
router.post('/', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  productValidation, 
  productController.createProduct
);

router.put('/:id', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  productValidation, 
  productController.updateProduct
);

router.patch('/:id/stock', 
  authMiddleware.requireRole(['Admin', 'Staff']), 
  productController.updateStock
);

// Delete - Admin only
router.delete('/:id', 
  authMiddleware.requireRole(['Admin']), 
  productController.deleteProduct
);

module.exports = router;