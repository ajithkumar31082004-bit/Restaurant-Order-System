const express = require('express');
const router = express.Router();
const waiterController = require('../controllers/waiterController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const mgmtAccess = roleMiddleware('admin','manager');
const waiterAccess = roleMiddleware('admin','manager','waiter');

// Customer raises request (no auth needed — anyone at a table can call waiter)
router.post('/request', waiterController.createRequest);

// Waiter / Admin routes
router.get('/tables', authMiddleware, waiterAccess, waiterController.getMyTables);
router.get('/requests', authMiddleware, waiterAccess, waiterController.getRequests);
router.put('/requests/:id/resolve', authMiddleware, waiterAccess, waiterController.resolveRequest);

// Admin / Manager — manage assignments
router.get('/assignments', authMiddleware, mgmtAccess, waiterController.getAllAssignments);
router.post('/assignments', authMiddleware, mgmtAccess, waiterController.createAssignment);
router.delete('/assignments/:id', authMiddleware, mgmtAccess, waiterController.deleteAssignment);

module.exports = router;
