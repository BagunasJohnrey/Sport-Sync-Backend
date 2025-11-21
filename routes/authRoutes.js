const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const registerValidation = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['Admin', 'Manager', 'Cashier']).withMessage('Valid role is required')
];

const updateProfileValidation = [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required')
];

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public routes
router.post('/login', loginValidation, authController.login);
router.get('/refresh', authController.refreshToken);
router.get('/logout', authController.logout);

// Protected routes
router.use(authMiddleware.verifyToken);

router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileValidation, authController.updateProfile);
router.post('/change-password', changePasswordValidation, authController.changePassword);
router.get('/verify', authController.verifyToken);

router.post('/register', 
  authMiddleware.requireRole(['Admin']), 
  registerValidation, 
  authController.register
);

module.exports = router;