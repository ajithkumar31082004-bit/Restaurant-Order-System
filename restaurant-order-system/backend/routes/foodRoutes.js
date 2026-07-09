const express = require('express');
const foodController = require('../controllers/foodController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', foodController.getAll);
router.get('/:id', foodController.getById);
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), foodController.create);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), foodController.update);
router.delete('/:id', authMiddleware, adminMiddleware, foodController.remove);

module.exports = router;
