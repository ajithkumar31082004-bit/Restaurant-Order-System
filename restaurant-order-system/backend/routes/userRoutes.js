const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Profile routes
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

// Favorites routes
router.get('/favorites', authMiddleware, userController.getFavorites);
router.post('/favorites', authMiddleware, userController.addFavorite);
router.delete('/favorites/:foodId', authMiddleware, userController.removeFavorite);

// Address routes
router.get('/addresses', authMiddleware, userController.getAddresses);
router.post('/addresses', authMiddleware, userController.addAddress);
router.delete('/addresses/:id', authMiddleware, userController.deleteAddress);

// Wallet routes
router.post('/wallet/add', authMiddleware, userController.addWalletBalance);

// Loyalty points routes
router.post('/loyalty/add', authMiddleware, userController.addRewardsPoints);
router.post('/loyalty/redeem', authMiddleware, userController.redeemRewardsPoints);

module.exports = router;
