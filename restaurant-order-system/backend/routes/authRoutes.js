const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authValidators } = require('../middleware/validators');

const router = express.Router();

router.post('/register', authValidators.register, validate, authController.register);
router.post('/login', authValidators.login, validate, authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
