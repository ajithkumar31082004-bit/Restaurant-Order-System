const pool = require('../config/database');

const Food = {
  async getAll(filters = {}) {
    let query = `
      SELECT f.*, c.name as category_name
      FROM foods f
      JOIN categories c ON f.category_id = c.id
      WHERE f.is_available = TRUE
    `;
    const params = [];

    if (filters.category) {
      query += ' AND f.category_id = ?';
      params.push(filters.category);
    }
    if (filters.is_veg !== undefined) {
      query += ' AND f.is_veg = ?';
      params.push(filters.is_veg === 'true' || filters.is_veg === true);
    }
    if (filters.minPrice) {
      query += ' AND COALESCE(f.discount_price, f.price) >= ?';
      params.push(filters.minPrice);
    }
    if (filters.maxPrice) {
      query += ' AND COALESCE(f.discount_price, f.price) <= ?';
      params.push(filters.maxPrice);
    }
    if (filters.search) {
      query += ' AND (f.name LIKE ? OR f.description LIKE ? OR f.ingredients LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }
    if (filters.featured) {
      query += ' AND f.is_featured = TRUE';
    }
    if (filters.bestseller) {
      query += ' AND f.is_bestseller = TRUE';
    }
    if (filters.special) {
      query += ' AND f.is_special = TRUE';
    }
    if (filters.minRating) {
      query += ' AND f.rating >= ?';
      params.push(filters.minRating);
    }
    if (filters.hasOffer) {
      query += ' AND f.discount_price IS NOT NULL';
    }

    const sortMap = {
      price_asc: 'COALESCE(f.discount_price, f.price) ASC',
      price_desc: 'COALESCE(f.discount_price, f.price) DESC',
      rating: 'f.rating DESC',
      name: 'f.name ASC',
      newest: 'f.created_at DESC'
    };
    query += ` ORDER BY ${sortMap[filters.sort] || 'f.is_featured DESC, f.rating DESC'}`;

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT f.*, c.name as category_name
       FROM foods f JOIN categories c ON f.category_id = c.id
       WHERE f.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO foods (category_id, name, description, ingredients, calories, price, discount_price, image, cooking_time, is_veg, is_featured, is_bestseller, is_special)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category_id, data.name, data.description, data.ingredients,
        data.calories || 0, data.price, data.discount_price || null,
        data.image || null, data.cooking_time || 30,
        data.is_veg !== false, data.is_featured || false,
        data.is_bestseller || false, data.is_special || false
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['category_id', 'name', 'description', 'ingredients', 'calories', 'price', 'discount_price', 'image', 'cooking_time', 'is_veg', 'is_available', 'is_featured', 'is_bestseller', 'is_special'];

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE foods SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM foods WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async getTopSelling(limit = 5) {
    const limitInt = parseInt(limit, 10) || 5;
    const [rows] = await pool.query(
      `SELECT f.id, f.name, f.image, COALESCE(SUM(oi.quantity),0) as total_sold, COALESCE(SUM(oi.total_price),0) as revenue
       FROM foods f
       LEFT JOIN order_items oi ON oi.food_id = f.id
       GROUP BY f.id ORDER BY total_sold DESC, f.rating DESC LIMIT ${limitInt}`
    );
    return rows;
  }
};

module.exports = Food;
