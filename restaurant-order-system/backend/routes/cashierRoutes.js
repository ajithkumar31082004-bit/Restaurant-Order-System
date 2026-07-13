const express = require('express');
const router = express.Router();
const cashierController = require('../controllers/cashierController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const cashierAccess = roleMiddleware('admin','manager','cashier');

router.get('/orders', authMiddleware, cashierAccess, cashierController.getPendingPaymentOrders);
router.get('/invoice/:orderId', cashierController.generateBill);
router.get('/invoice/:orderId/pdf', cashierController.downloadInvoice);
router.post('/split-bill', authMiddleware, cashierAccess, cashierController.splitBill);
router.post('/refund', authMiddleware, cashierAccess, cashierController.processRefund);

module.exports = router;
