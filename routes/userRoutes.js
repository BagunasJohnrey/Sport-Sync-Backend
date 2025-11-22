const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

const userValidation = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Apply authentication middleware to all user routes
router.use(authMiddleware.verifyToken);

// [Fixed] Only Admin can view/manage users (Staff cannot view users)
router.get('/', authMiddleware.requireRole(['Admin']), userController.getAllUsers);
router.get('/:id', authMiddleware.requireRole(['Admin']), userController.getUserById);
router.post('/', authMiddleware.requireRole(['Admin']), userValidation, userController.createUser);
router.put('/:id', authMiddleware.requireRole(['Admin']), userValidation, userController.updateUser);
router.delete('/:id', authMiddleware.requireRole(['Admin']), userController.deleteUser);

module.exports = router;