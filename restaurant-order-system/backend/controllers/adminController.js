const Order = require('../models/Order');
const Food = require('../models/Food');
const User = require('../models/User');
const pool = require('../config/database');

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
      res.json({ success: true, data: result });
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
