const express = require('express');
const orderController = require('../controllers/orderController');
const { authMiddleware, adminMiddleware, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { orderValidators } = require('../middleware/validators');

const router = express.Router();

router.post('/', optionalAuth, orderValidators.create, validate, orderController.create);
router.get('/track/:id', orderController.trackOrder);
router.get('/:id/invoice', orderController.downloadInvoice);
router.get('/', authMiddleware, orderController.getAll);
router.get('/:id', authMiddleware, orderController.getById);
router.put('/:id', authMiddleware, adminMiddleware, orderController.updateStatus);
router.delete('/:id', authMiddleware, adminMiddleware, orderController.remove);

module.exports = router;
