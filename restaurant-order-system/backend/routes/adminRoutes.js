const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/health', adminController.healthCheck);
router.get('/dashboard', authMiddleware, adminMiddleware, adminController.getDashboardStats);
router.get('/users', authMiddleware, adminMiddleware, adminController.getUsers);
router.delete('/users/:id', authMiddleware, adminMiddleware, adminController.deleteUser);
router.put('/users/:id/role', authMiddleware, adminMiddleware, adminController.updateUserRole);
router.post('/staff', authMiddleware, adminMiddleware, adminController.createStaffUser);
router.get('/export/orders', authMiddleware, adminMiddleware, adminController.exportOrdersCSV);
router.get('/offers', adminController.getOffers);
router.post('/offers', authMiddleware, adminMiddleware, adminController.createOffer);

module.exports = router;
