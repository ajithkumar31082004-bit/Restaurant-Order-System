const Category = require('../models/Category');

const categoryController = {
  async getAll(req, res, next) {
    try {
      const activeOnly = req.query.all !== 'true';
      const categories = await Category.getAll(activeOnly);
      res.json({ success: true, count: categories.length, data: categories });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) data.image = `/uploads/${req.file.filename}`;
      const category = await Category.create(data);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) data.image = `/uploads/${req.file.filename}`;
      const category = await Category.update(req.params.id, data);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await Category.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = categoryController;
