const pool = require('../config/database');
const Table = require('./Table');

const fallbackReservations = [];
let fallbackReservationId = 1;

function cloneReservations() {
  return fallbackReservations.map((reservation) => ({ ...reservation }));
}

const Reservation = {
  generateReservationId() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `RES${num}`;
  },

  async create(data) {
    try {
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
    } catch (error) {
      const reservation = {
        id: fallbackReservationId++,
        reservation_id: this.generateReservationId(),
        user_id: data.user_id || null,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        table_id: data.table_id || null,
        reservation_date: data.reservation_date,
        reservation_time: data.reservation_time,
        guest_count: data.guest_count,
        table_preference: data.table_preference || 'any',
        special_event: data.special_event || 'none',
        special_requests: data.special_requests || null,
        status: 'pending',
        branch_id: data.branch_id || 1,
        table_number: null,
        floor: null,
        table_type: null,
        capacity: null
      };
      fallbackReservations.push(reservation);
      return reservation;
    }
  },

  async findById(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT r.*, t.table_number, t.floor, t.table_type, t.capacity
         FROM table_reservations r
         LEFT JOIN restaurant_tables t ON r.table_id = t.id
         WHERE r.id = ?`, [id]
      );
      return rows[0] || null;
    } catch (error) {
      return cloneReservations().find((reservation) => reservation.id === parseInt(id, 10)) || null;
    }
  },

  async findByReservationId(reservationId) {
    try {
      const [rows] = await pool.execute(
        `SELECT r.*, t.table_number, t.floor, t.table_type, t.capacity
         FROM table_reservations r
         LEFT JOIN restaurant_tables t ON r.table_id = t.id
         WHERE r.reservation_id = ?`, [reservationId]
      );
      return rows[0] || null;
    } catch (error) {
      return cloneReservations().find((reservation) => reservation.reservation_id === reservationId) || null;
    }
  },

  async getAll(filters = {}) {
    try {
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
    } catch (error) {
      return cloneReservations().filter((reservation) => {
        if (filters.status && reservation.status !== filters.status) return false;
        if (filters.date && reservation.reservation_date !== filters.date) return false;
        if (filters.user_id && reservation.user_id !== filters.user_id) return false;
        return true;
      }).slice(0, filters.limit ? parseInt(filters.limit, 10) : undefined);
    }
  },

  async updateStatus(id, status, confirmedBy = null) {
    try {
      await pool.execute(
        'UPDATE table_reservations SET status = ?, confirmed_by = ? WHERE id = ?',
        [status, confirmedBy, id]
      );
      return this.findById(id);
    } catch (error) {
      const reservation = cloneReservations().find((item) => item.id === parseInt(id, 10));
      if (reservation) {
        reservation.status = status;
        reservation.confirmed_by = confirmedBy;
        return { ...reservation };
      }
      return null;
    }
  },

  async findAvailableTable(date, time, guestCount, preference) {
    try {
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
    } catch (error) {
      const tables = (await Table.getAll({})).filter((table) => {
        if (table.capacity < guestCount) return false;
        if (table.status !== 'available') return false;
        if (preference && preference !== 'any' && table.table_type !== preference) return false;
        return true;
      });
      return tables[0] || null;
    }
  },

  async getAvailableTables(date, time, guestCount) {
    try {
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
    } catch (error) {
      return (await Table.getAll({})).filter((table) => {
        if (table.capacity < guestCount) return false;
        if (table.status !== 'available') return false;
        return true;
      });
    }
  },

  async getTodayStats() {
    try {
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
    } catch (error) {
      const reservations = cloneReservations();
      return {
        total: reservations.length,
        pending: reservations.filter((reservation) => reservation.status === 'pending').length,
        confirmed: reservations.filter((reservation) => reservation.status === 'confirmed').length,
        seated: reservations.filter((reservation) => reservation.status === 'seated').length,
        cancelled: reservations.filter((reservation) => reservation.status === 'cancelled').length
      };
    }
  }
};

module.exports = Reservation;
