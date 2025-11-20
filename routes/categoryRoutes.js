const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { body } = require('express-validator');

const categoryValidation = [
  body('category_name').notEmpty().withMessage('Category name is required')
];

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', categoryValidation, categoryController.createCategory);
router.put('/:id', categoryValidation, categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;