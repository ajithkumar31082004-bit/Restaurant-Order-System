const pool = require('../config/database');

const Coupon = {
  async findByCode(code) {
    const [rows] = await pool.execute(
      `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE
       AND valid_from <= CURDATE() AND valid_until >= CURDATE()`,
      [code.toUpperCase()]
    );
    return rows[0] || null;
  },

  async getAll() {
    const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY created_at DESC');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code.toUpperCase(), data.description, data.discount_type || 'percentage',
        data.discount_value, data.min_order_amount || 0, data.max_discount || null,
        data.usage_limit || null, data.valid_from, data.valid_until
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    ['code', 'description', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount', 'usage_limit', 'valid_from', 'valid_until', 'is_active'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'code' ? data[key].toUpperCase() : data[key]);
      }
    });
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async incrementUsage(id) {
    await pool.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [id]);
  },

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM coupons WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async validate(code, orderAmount) {
    const coupon = await this.findByCode(code);
    if (!coupon) return { valid: false, message: 'Invalid coupon code' };
    if (orderAmount < coupon.min_order_amount) {
      return { valid: false, message: `Minimum order amount is Rs ${coupon.min_order_amount}` };
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { valid: false, message: 'Coupon usage limit reached' };
    }
    return { valid: true, coupon };
  }
};

module.exports = Coupon;
