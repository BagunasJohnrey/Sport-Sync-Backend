const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

const transactionValidation = [
  body('user_id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('payment_method').isIn(['Cash', 'Card', 'Mobile']).withMessage('Valid payment method is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
  body('amount_paid').isFloat({ min: 0 }).withMessage('Valid amount paid is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
];

// Apply authentication to all transaction routes
router.use(authMiddleware.verifyToken);

// Reports & History - Admin Only (Staff cannot view transactions)
router.get('/', 
  authMiddleware.requireRole(['Admin']), 
  transactionController.getAllTransactions
);

router.get('/report/sales', 
  authMiddleware.requireRole(['Admin']), 
  transactionController.getSalesReport
);

router.get('/:id', 
  authMiddleware.requireRole(['Admin']), 
  transactionController.getTransactionById
);

router.get('/:id/receipt',
   authMiddleware.requireRole(['Admin', 'Cashier']),
    transactionController.downloadReceipt
  );

// POS / Create Transaction - Admin & Cashier (Staff cannot use POS)
router.post('/', 
  authMiddleware.requireRole(['Admin', 'Cashier']), 
  transactionValidation, 
  transactionController.createTransaction
);

// Update Status - Admin Only
router.patch('/:id/status', 
  authMiddleware.requireRole(['Admin']), 
  transactionController.updateTransactionStatus
);

module.exports = router;