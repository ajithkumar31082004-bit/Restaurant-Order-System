const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const config = require('../config/config');

const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, role, wallet_balance, rewards_points, avatar, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, phone, password, role = 'customer' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, role]
    );
    return { id: result.insertId, name, email, phone, role };
  },

  async comparePassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
  },

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  },

  async updateProfile(id, data) {
    const fields = [];
    const values = [];

    ['name', 'phone', 'avatar'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async getAll(page = 1, limit = 20) {
    const limitInt = parseInt(limit, 10) || 20;
    const offsetInt = (parseInt(page, 10) - 1) * limitInt;
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, wallet_balance, rewards_points, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
    );
    const [count] = await pool.execute('SELECT COUNT(*) as total FROM users');
    return { users: rows, total: count[0].total };
  },

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ? AND role != ?', [id, 'admin']);
    return result.affectedRows > 0;
  }
};

module.exports = User;
