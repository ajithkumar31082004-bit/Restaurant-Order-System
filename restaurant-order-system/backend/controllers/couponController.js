const Coupon = require('../models/Coupon');

const couponController = {
  async getAll(req, res, next) {
    try {
      const coupons = await Coupon.getAll();
      res.json({ success: true, data: coupons });
    } catch (error) {
      next(error);
    }
  },

  async validate(req, res, next) {
    try {
      const { code, amount } = req.body;
      const result = await Coupon.validate(code, amount);
      res.json({ success: result.valid, ...result });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const coupon = await Coupon.create(req.body);
      res.status(201).json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const coupon = await Coupon.update(req.params.id, req.body);
      if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
      res.json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await Coupon.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Coupon not found' });
      res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = couponController;
