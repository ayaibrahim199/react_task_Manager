const express = require('express');
const protect = require('../middleware/authMiddleware');
const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const { createTask, getTasks, updateTask, deleteTask } = require('../controllers/taskController');

const router = express.Router();

router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid ISO date'),
    body('priority').optional().isIn(['low','medium','high']).withMessage('priority must be low, medium, or high'),
    body('recurrence').optional().isIn(['none','daily','weekly','monthly']).withMessage('Invalid recurrence'),
    body('remindMinutesBefore').optional().isInt({ min: 0 }).withMessage('remindMinutesBefore must be >= 0'),
    body('order').optional().isNumeric().withMessage('order must be a number')
  ],
  validateRequest,
  createTask
);

router.get('/', protect, getTasks);

router.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid task id'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('completed').optional().isBoolean().withMessage('Completed must be boolean'),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid ISO date'),
    body('priority').optional().isIn(['low','medium','high']).withMessage('priority must be low, medium, or high'),
    body('recurrence').optional().isIn(['none','daily','weekly','monthly']).withMessage('Invalid recurrence'),
    body('remindMinutesBefore').optional().isInt({ min: 0 }).withMessage('remindMinutesBefore must be >= 0'),
    body('order').optional().isNumeric().withMessage('order must be a number')
  ],
  validateRequest,
  updateTask
);

router.delete('/:id', protect, deleteTask);

module.exports = router;
