const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', asyncHandler(tasksController.getTasks));
router.post('/', asyncHandler(tasksController.createTask));
router.put('/:id', asyncHandler(tasksController.updateTask));
router.patch('/:id', asyncHandler(tasksController.updateTask));
router.delete('/:id', asyncHandler(tasksController.deleteTask));

module.exports = router;
