const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authMiddleware, optionalAuth, roleMiddleware } = require('../middleware/auth');

router.get('/available-tables', reservationController.getAvailableTables);
router.get('/stats', authMiddleware, roleMiddleware('admin','manager'), reservationController.getStats);
router.post('/', optionalAuth, reservationController.create);
router.get('/', authMiddleware, reservationController.getAll);
router.get('/:id', reservationController.getById);
router.put('/:id/status', authMiddleware, roleMiddleware('admin','manager','waiter'), reservationController.updateStatus);

module.exports = router;
