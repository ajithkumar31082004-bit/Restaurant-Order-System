const pool = require('../config/database');

const Reservation = {
  generateReservationId() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `RES${num}`;
  },

  async create(data) {
    const reservationId = this.generateReservationId();
    const [result] = await pool.execute(
      `INSERT INTO table_reservations
        (reservation_id, user_id, customer_name, customer_phone, customer_email,
         table_id, reservation_date, reservation_time, guest_count,
         table_preference, special_event, special_requests, status, branch_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        reservationId,
        data.user_id || null,
        data.customer_name,
        data.customer_phone,
        data.customer_email || null,
        data.table_id || null,
        data.reservation_date,
        data.reservation_time,
        data.guest_count,
        data.table_preference || 'any',
        data.special_event || 'none',
        data.special_requests || null,
        'pending',
        data.branch_id || 1
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT r.*, t.table_number, t.floor, t.table_type, t.capacity
       FROM table_reservations r
       LEFT JOIN restaurant_tables t ON r.table_id = t.id
       WHERE r.id = ?`, [id]
    );
    return rows[0] || null;
  },

  async findByReservationId(reservationId) {
    const [rows] = await pool.execute(
      `SELECT r.*, t.table_number, t.floor, t.table_type, t.capacity
       FROM table_reservations r
       LEFT JOIN restaurant_tables t ON r.table_id = t.id
       WHERE r.reservation_id = ?`, [reservationId]
    );
    return rows[0] || null;
  },

  async getAll(filters = {}) {
    let query = `SELECT r.*, t.table_number, t.floor, t.table_type
                 FROM table_reservations r
                 LEFT JOIN restaurant_tables t ON r.table_id = t.id
                 WHERE 1=1`;
    const params = [];

    if (filters.status) { query += ' AND r.status = ?'; params.push(filters.status); }
    if (filters.date) { query += ' AND r.reservation_date = ?'; params.push(filters.date); }
    if (filters.user_id) { query += ' AND r.user_id = ?'; params.push(filters.user_id); }

    query += ' ORDER BY r.reservation_date ASC, r.reservation_time ASC';

    if (filters.limit) { query += ' LIMIT ?'; params.push(parseInt(filters.limit, 10)); }

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  async updateStatus(id, status, confirmedBy = null) {
    await pool.execute(
      'UPDATE table_reservations SET status = ?, confirmed_by = ? WHERE id = ?',
      [status, confirmedBy, id]
    );
    return this.findById(id);
  },

  // Find best available table for the given date/time/guests/preference
  async findAvailableTable(date, time, guestCount, preference) {
    let query = `
      SELECT t.* FROM restaurant_tables t
      WHERE t.capacity >= ?
        AND t.status = 'available'
        AND t.id NOT IN (
          SELECT table_id FROM table_reservations
          WHERE reservation_date = ?
            AND status IN ('pending','confirmed')
            AND ABS(TIMEDIFF(reservation_time, ?) / 10000) < 2
        )`;
    const params = [guestCount, date, time];

    if (preference && preference !== 'any') {
      query += ' AND t.table_type = ?';
      params.push(preference);
    }
    query += ' ORDER BY t.capacity ASC LIMIT 1';

    const [rows] = await pool.execute(query, params);
    return rows[0] || null;
  },

  async getAvailableTables(date, time, guestCount) {
    const [rows] = await pool.execute(
      `SELECT t.* FROM restaurant_tables t
       WHERE t.capacity >= ?
         AND t.status = 'available'
         AND t.id NOT IN (
           SELECT table_id FROM table_reservations
           WHERE reservation_date = ?
             AND status IN ('pending','confirmed')
             AND ABS(TIMEDIFF(reservation_time, ?) / 10000) < 2
         )
       ORDER BY t.capacity ASC, t.table_type ASC`,
      [guestCount, date, time]
    );
    return rows;
  },

  async getTodayStats() {
    const [rows] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status='seated' THEN 1 ELSE 0 END) as seated,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM table_reservations WHERE reservation_date = CURDATE()
    `);
    return rows[0];
  }
};

module.exports = Reservation;
