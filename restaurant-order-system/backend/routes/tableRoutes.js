const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authMiddleware, adminMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/floor-map', tableController.getFloorMap);
router.get('/stats', tableController.getStats);
router.get('/', tableController.getAll);
router.get('/:id', tableController.getById);
router.get('/:id/qr', tableController.getQRCode);

router.post('/', authMiddleware, adminMiddleware, tableController.create);
router.put('/:id', authMiddleware, roleMiddleware('admin','manager'), tableController.update);
router.put('/:id/status', authMiddleware, roleMiddleware('admin','manager','waiter'), tableController.updateStatus);
router.post('/:id/transfer', authMiddleware, roleMiddleware('admin','manager','waiter'), tableController.transfer);
router.delete('/:id', authMiddleware, adminMiddleware, tableController.remove);

module.exports = router;
