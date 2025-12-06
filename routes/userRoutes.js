const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

// Validation for creating a NEW user (All fields required)
const createUserValidation = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Validation for UPDATING a user (Fields are optional)
const updateUserValidation = [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['Admin', 'Staff', 'Cashier']).withMessage('Invalid role'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

// Apply authentication middleware to all user routes
router.use(authMiddleware.verifyToken);

// Only Admin can view/manage users (Staff and Cashier cannot view users)
router.get('/', authMiddleware.requireRole(['Admin']), userController.getAllUsers);
router.get('/:id', authMiddleware.requireRole(['Admin']), userController.getUserById);

// Apply createUserValidation for POST
router.post('/', 
  authMiddleware.requireRole(['Admin']), 
  createUserValidation, 
  userController.createUser
);

// Apply updateUserValidation for PUT
router.put('/:id', 
  authMiddleware.requireRole(['Admin']), 
  updateUserValidation, 
  userController.updateUser
);

router.delete('/:id', authMiddleware.requireRole(['Admin']), userController.deleteUser);

module.exports = router;