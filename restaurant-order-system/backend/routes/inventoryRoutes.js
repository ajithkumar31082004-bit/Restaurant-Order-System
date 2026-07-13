const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const mgmtAccess = roleMiddleware('admin','manager');

router.get('/low-stock', authMiddleware, mgmtAccess, inventoryController.getLowStock);
router.get('/purchases', authMiddleware, mgmtAccess, inventoryController.getPurchases);
router.get('/', authMiddleware, mgmtAccess, inventoryController.getAll);
router.get('/:id', authMiddleware, mgmtAccess, inventoryController.getById);
router.post('/', authMiddleware, mgmtAccess, inventoryController.create);
router.put('/:id', authMiddleware, mgmtAccess, inventoryController.update);
router.delete('/:id', authMiddleware, mgmtAccess, inventoryController.remove);
router.post('/purchases', authMiddleware, mgmtAccess, inventoryController.recordPurchase);
router.post('/deduct', authMiddleware, mgmtAccess, inventoryController.deductStock);

module.exports = router;
