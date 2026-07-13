const pool = require('../config/database');

const inventoryController = {

  // GET /api/inventory
  async getAll(req, res, next) {
    try {
      const { category, search } = req.query;
      let query = 'SELECT * FROM inventory WHERE 1=1';
      const params = [];
      if (category) { query += ' AND category = ?'; params.push(category); }
      if (search)   { query += ' AND item_name LIKE ?'; params.push(`%${search}%`); }
      query += ' ORDER BY category ASC, item_name ASC';
      const [rows] = await pool.execute(query, params);
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/inventory/low-stock
  async getLowStock(req, res, next) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM inventory WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/inventory/:id
  async getById(req, res, next) {
    try {
      const [rows] = await pool.execute('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  },

  // POST /api/inventory
  async create(req, res, next) {
    try {
      const { item_name, category, quantity, unit, low_stock_threshold, cost_per_unit, supplier_name } = req.body;
      if (!item_name || quantity === undefined || !unit) {
        return res.status(400).json({ success: false, message: 'item_name, quantity, and unit are required' });
      }
      const [result] = await pool.execute(
        `INSERT INTO inventory (item_name, category, quantity, unit, low_stock_threshold, cost_per_unit, supplier_name)
         VALUES (?,?,?,?,?,?,?)`,
        [item_name, category || 'other', quantity, unit, low_stock_threshold || 1, cost_per_unit || 0, supplier_name || null]
      );
      const [rows] = await pool.execute('SELECT * FROM inventory WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Item added to inventory', data: rows[0] });
    } catch (err) { next(err); }
  },

  // PUT /api/inventory/:id
  async update(req, res, next) {
    try {
      const allowed = ['item_name','category','quantity','unit','low_stock_threshold','cost_per_unit','supplier_name'];
      const fields = [];
      const values = [];
      allowed.forEach(k => {
        if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
      });
      if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
      values.push(req.params.id);
      await pool.execute(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, values);
      const [rows] = await pool.execute('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Inventory updated', data: rows[0] });
    } catch (err) { next(err); }
  },

  // DELETE /api/inventory/:id
  async remove(req, res, next) {
    try {
      const [result] = await pool.execute('DELETE FROM inventory WHERE id = ?', [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true, message: 'Item removed from inventory' });
    } catch (err) { next(err); }
  },

  // POST /api/inventory/purchases — record a restock purchase
  async recordPurchase(req, res, next) {
    try {
      const { inventory_id, supplier_name, quantity, unit_cost, invoice_number } = req.body;
      if (!inventory_id || !quantity || !unit_cost) {
        return res.status(400).json({ success: false, message: 'inventory_id, quantity, unit_cost required' });
      }
      const total_cost = quantity * unit_cost;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          `INSERT INTO inventory_purchases (inventory_id, supplier_name, quantity, unit_cost, total_cost, invoice_number, purchased_by)
           VALUES (?,?,?,?,?,?,?)`,
          [inventory_id, supplier_name || null, quantity, unit_cost, total_cost, invoice_number || null, req.user?.id || null]
        );
        await connection.execute(
          'UPDATE inventory SET quantity = quantity + ?, last_restocked_at = NOW() WHERE id = ?',
          [quantity, inventory_id]
        );
        await connection.commit();
        res.status(201).json({ success: true, message: 'Purchase recorded and stock updated' });
      } catch (e) {
        await connection.rollback(); throw e;
      } finally {
        connection.release();
      }
    } catch (err) { next(err); }
  },

  // POST /api/inventory/deduct — deduct stock when order placed
  async deductStock(req, res, next) {
    try {
      const { deductions } = req.body; // [{ inventory_id, quantity }]
      if (!deductions?.length) {
        return res.status(400).json({ success: false, message: 'deductions array required' });
      }
      for (const d of deductions) {
        await pool.execute(
          'UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?',
          [d.quantity, d.inventory_id]
        );
      }
      res.json({ success: true, message: 'Stock deducted' });
    } catch (err) { next(err); }
  },

  // GET /api/inventory/purchases
  async getPurchases(req, res, next) {
    try {
      const [rows] = await pool.execute(
        `SELECT ip.*, i.item_name, i.unit, u.name as purchased_by_name
         FROM inventory_purchases ip
         JOIN inventory i ON ip.inventory_id = i.id
         LEFT JOIN users u ON ip.purchased_by = u.id
         ORDER BY ip.purchased_at DESC LIMIT 100`
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) { next(err); }
  }
};

module.exports = inventoryController;
