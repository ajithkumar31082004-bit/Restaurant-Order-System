const User = require('../models/User');

const authController = {
  async register(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ name, email, phone, password });
      const token = User.generateToken(user);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user, token }
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isMatch = await User.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      const token = User.generateToken(user);
      const { password: _, ...safeUser } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: { user: safeUser, token }
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const user = await User.updateProfile(req.user.id, req.body);
      res.json({ success: true, message: 'Profile updated', data: user });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
