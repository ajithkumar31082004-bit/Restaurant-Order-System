const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', categoryController.getAll);
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), categoryController.create);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), categoryController.update);
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.remove);

module.exports = router;
