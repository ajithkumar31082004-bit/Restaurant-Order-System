const express = require('express');
const couponController = require('../controllers/couponController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/validate', couponController.validate);
router.get('/', authMiddleware, adminMiddleware, couponController.getAll);
router.post('/', authMiddleware, adminMiddleware, couponController.create);
router.put('/:id', authMiddleware, adminMiddleware, couponController.update);
router.delete('/:id', authMiddleware, adminMiddleware, couponController.remove);

module.exports = router;
