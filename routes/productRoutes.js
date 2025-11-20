const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { body } = require('express-validator');

const productValidation = [
  body('barcode').notEmpty().withMessage('Barcode is required'),
  body('product_name').notEmpty().withMessage('Product name is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price is required')
];

router.get('/', productController.getAllProducts);
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/:id', productController.getProductById);
router.post('/', productValidation, productController.createProduct);
router.put('/:id', productValidation, productController.updateProduct);
router.patch('/:id/stock', productController.updateStock);
router.delete('/:id', productController.deleteProduct);

module.exports = router;