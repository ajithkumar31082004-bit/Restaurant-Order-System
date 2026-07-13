const pool = require('../config/database');

const Table = {
  async getAll(filters = {}) {
    let query = `SELECT t.*, b.name as branch_name FROM restaurant_tables t
                 LEFT JOIN branches b ON t.branch_id = b.id WHERE 1=1`;
    const params = [];
    if (filters.floor)  { query += ' AND t.floor = ?'; params.push(filters.floor); }
    if (filters.status) { query += ' AND t.status = ?'; params.push(filters.status); }
    query += ' ORDER BY t.floor ASC, t.table_number ASC';
    const [rows] = await pool.execute(query, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT t.*, b.name as branch_name FROM restaurant_tables t
       LEFT JOIN branches b ON t.branch_id = b.id WHERE t.id = ?`, [id]
    );
    return rows[0] || null;
  },

  async findByTableNumber(tableNumber) {
    const [rows] = await pool.execute(
      'SELECT * FROM restaurant_tables WHERE table_number = ?', [tableNumber]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    await pool.execute(
      'UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, id]
    );
    return this.findById(id);
  },

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO restaurant_tables
        (table_number, floor, table_type, capacity, status, branch_id, position_x, position_y)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        data.table_number, data.floor || 'ground', data.table_type || 'indoor',
        data.capacity || 4, data.status || 'available', data.branch_id || 1,
        data.position_x || 0, data.position_y || 0
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['table_number','floor','table_type','capacity','status','qr_code_url','position_x','position_y'];
    allowed.forEach(key => {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    });
    if (!fields.length) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE restaurant_tables SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM restaurant_tables WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async getFloorMap() {
    const [rows] = await pool.execute(
      `SELECT t.*, 
              o.order_id as current_order_id,
              o.order_status as current_order_status,
              r.reservation_id as upcoming_reservation_id,
              r.reservation_time as upcoming_reservation_time,
              r.guest_count as upcoming_guests
       FROM restaurant_tables t
       LEFT JOIN orders o ON o.table_id = t.id 
         AND o.order_status NOT IN ('Delivered','Cancelled')
         AND o.order_type = 'dine-in'
       LEFT JOIN table_reservations r ON r.table_id = t.id 
         AND r.reservation_date = CURDATE()
         AND r.status IN ('confirmed','pending')
       ORDER BY t.floor ASC, t.position_y ASC, t.position_x ASC`
    );

    // Group by floor
    const floorMap = {};
    rows.forEach(table => {
      if (!floorMap[table.floor]) floorMap[table.floor] = [];
      floorMap[table.floor].push(table);
    });
    return floorMap;
  },

  async getStats() {
    const [rows] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status='cleaning' THEN 1 ELSE 0 END) as cleaning
      FROM restaurant_tables WHERE status != 'inactive'
    `);
    return rows[0];
  },

  async transferOrder(fromTableId, toTableId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Move all active dine-in orders to new table
      await connection.execute(
        `UPDATE orders SET table_id = ?
         WHERE table_id = ? AND order_status NOT IN ('Delivered','Cancelled')`,
        [toTableId, fromTableId]
      );
      // Move waiter requests
      await connection.execute(
        'UPDATE waiter_requests SET table_id = ? WHERE table_id = ? AND status = "pending"',
        [toTableId, fromTableId]
      );
      // Free old table, mark new as occupied
      await connection.execute("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [fromTableId]);
      await connection.execute("UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?", [toTableId]);
      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};

module.exports = Table;
