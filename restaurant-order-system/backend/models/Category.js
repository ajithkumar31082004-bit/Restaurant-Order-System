const pool = require('../config/database');

const Category = {
  async getAll(activeOnly = true) {
    let query = 'SELECT * FROM categories';
    if (activeOnly) query += ' WHERE is_active = TRUE';
    query += ' ORDER BY sort_order ASC, name ASC';
    const [rows] = await pool.execute(query);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, description, image, sort_order) VALUES (?, ?, ?, ?)',
      [data.name, data.description || null, data.image || null, data.sort_order || 0]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    ['name', 'description', 'image', 'is_active', 'sort_order'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Category;
