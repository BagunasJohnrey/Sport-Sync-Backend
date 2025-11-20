const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { body } = require('express-validator');

const transactionValidation = [
  body('user_id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('payment_method').isIn(['Cash', 'Card', 'Mobile']).withMessage('Valid payment method is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
  body('amount_paid').isFloat({ min: 0 }).withMessage('Valid amount paid is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
];

router.get('/', transactionController.getAllTransactions);
router.get('/report/sales', transactionController.getSalesReport);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionValidation, transactionController.createTransaction);
router.patch('/:id/status', transactionController.updateTransactionStatus);

module.exports = router;