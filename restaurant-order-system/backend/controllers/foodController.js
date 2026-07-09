const Food = require('../models/Food');

const foodController = {
  async getAll(req, res, next) {
    try {
      const foods = await Food.getAll(req.query);
      res.json({ success: true, count: foods.length, data: foods });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const food = await Food.findById(req.params.id);
      if (!food) {
        return res.status(404).json({ success: false, message: 'Food not found' });
      }
      res.json({ success: true, data: food });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.image = `/uploads/${req.file.filename}`;
      }
      const food = await Food.create(data);
      res.status(201).json({ success: true, message: 'Food created', data: food });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.image = `/uploads/${req.file.filename}`;
      }
      const food = await Food.update(req.params.id, data);
      if (!food) {
        return res.status(404).json({ success: false, message: 'Food not found' });
      }
      res.json({ success: true, message: 'Food updated', data: food });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await Food.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Food not found' });
      }
      res.json({ success: true, message: 'Food deleted' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = foodController;
