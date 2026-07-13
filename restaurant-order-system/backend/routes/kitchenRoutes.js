const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const kitchenAccess = roleMiddleware('admin','manager','chef');

router.get('/orders', authMiddleware, kitchenAccess, kitchenController.getOrders);
router.get('/stats', authMiddleware, kitchenAccess, kitchenController.getStats);
router.put('/orders/:id/status', authMiddleware, kitchenAccess, kitchenController.updateStatus);

module.exports = router;
