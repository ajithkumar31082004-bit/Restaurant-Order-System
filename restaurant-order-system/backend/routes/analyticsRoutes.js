const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const mgmtAccess = roleMiddleware('admin','manager');

router.get('/summary', authMiddleware, mgmtAccess, analyticsController.getSummary);
router.get('/revenue', authMiddleware, mgmtAccess, analyticsController.getRevenue);
router.get('/peak-hours', authMiddleware, mgmtAccess, analyticsController.getPeakHours);
router.get('/popular-dishes', authMiddleware, mgmtAccess, analyticsController.getPopularDishes);
router.get('/table-utilization', authMiddleware, mgmtAccess, analyticsController.getTableUtilization);
router.get('/reservation-trend', authMiddleware, mgmtAccess, analyticsController.getReservationTrend);
router.get('/order-types', authMiddleware, mgmtAccess, analyticsController.getOrderTypes);
router.get('/customer-satisfaction', authMiddleware, mgmtAccess, analyticsController.getCustomerSatisfaction);

module.exports = router;
