const Order = require('../models/Order');
const Food = require('../models/Food');
const User = require('../models/User');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const adminController = {
  async getDashboardStats(req, res, next) {
    try {
      const stats = await Order.getStats();
      const topFoods = await Food.getTopSelling(5);
      res.json({ success: true, data: { ...stats, top_foods: topFoods } });
    } catch (error) {
      next(error);
    }
  },

  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await User.getAll(page, limit);
      res.json({ success: true, data: result.users });
    } catch (error) {
      next(error);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const deleted = await User.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/users/:id/role
  async updateUserRole(req, res, next) {
    try {
      const { role } = req.body;
      const validRoles = ['admin', 'manager', 'chef', 'waiter', 'cashier', 'customer'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role. Must be one of: ' + validRoles.join(', ') });
      }
      const [result] = await pool.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const user = await User.findById(req.params.id);
      res.json({ success: true, message: `Role updated to ${role}`, data: user });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/staff — create a new staff/user account
  async createStaffUser(req, res, next) {
    try {
      const { name, email, phone, password, role } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'name, email, password and role are required' });
      }
      const validRoles = ['manager', 'chef', 'waiter', 'cashier', 'customer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role. Must be one of: ' + validRoles.join(', ') });
      }
      // Check if email already exists
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, phone || null, hashedPassword, role]
      );
      const newUser = await User.findById(result.insertId);
      res.status(201).json({ success: true, message: `${role} account created successfully`, data: newUser });
    } catch (error) {
      next(error);
    }
  },

  async exportOrdersCSV(req, res, next) {
    try {
      const orders = await Order.getAll({ limit: 1000 });
      const headers = 'Order ID,Customer,Phone,Total,Status,Payment,Date\n';
      const rows = orders.map((o) =>
        `${o.order_id},${o.customer_name},${o.customer_phone},${o.total_amount},${o.order_status},${o.payment_method},${o.created_at}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders-export.csv');
      res.send(headers + rows);
    } catch (error) {
      next(error);
    }
  },

  async getOffers(req, res, next) {
    try {
      const [rows] = await pool.execute('SELECT * FROM offers ORDER BY created_at DESC');
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  async createOffer(req, res, next) {
    try {
      const { title, description, discount_percent, valid_from, valid_until } = req.body;
      const [result] = await pool.execute(
        'INSERT INTO offers (title, description, discount_percent, valid_from, valid_until) VALUES (?, ?, ?, ?, ?)',
        [title, description, discount_percent || 0, valid_from, valid_until]
      );
      res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (error) {
      next(error);
    }
  },

  async healthCheck(req, res) {
    try {
      await pool.execute('SELECT 1');
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({ success: false, status: 'unhealthy', message: error.message });
    }
  }
};

module.exports = adminController;
