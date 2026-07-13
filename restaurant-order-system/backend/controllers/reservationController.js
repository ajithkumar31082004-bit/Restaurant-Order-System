const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const pool = require('../config/database');

const reservationController = {

  // POST /api/reservations
  async create(req, res, next) {
    try {
      const {
        customer_name, customer_phone, customer_email,
        reservation_date, reservation_time, guest_count,
        table_preference, special_event, special_requests
      } = req.body;

      if (!customer_name || !customer_phone || !reservation_date || !reservation_time || !guest_count) {
        return res.status(400).json({ success: false, message: 'Name, phone, date, time, and guest count are required.' });
      }

      // Auto-assign best table
      let table = null;
      table = await Reservation.findAvailableTable(
        reservation_date, reservation_time, guest_count, table_preference
      );

      const data = {
        user_id: req.user?.id || null,
        customer_name, customer_phone, customer_email,
        reservation_date, reservation_time,
        guest_count: parseInt(guest_count, 10),
        table_preference: table_preference || 'any',
        special_event: special_event || 'none',
        special_requests: special_requests || null,
        table_id: table?.id || null,
        branch_id: 1
      };

      const reservation = await Reservation.create(data);

      // If table assigned, mark it reserved
      if (table) {
        await Table.updateStatus(table.id, 'reserved');
      }

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/reservations
  async getAll(req, res, next) {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.date)   filters.date   = req.query.date;
      if (req.query.limit)  filters.limit  = req.query.limit;

      // Customers only see their own
      if (req.user?.role === 'customer') {
        filters.user_id = req.user.id;
      }

      const reservations = await Reservation.getAll(filters);
      res.json({ success: true, count: reservations.length, data: reservations });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/reservations/stats
  async getStats(req, res, next) {
    try {
      const stats = await Reservation.getTodayStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/reservations/available-tables
  async getAvailableTables(req, res, next) {
    try {
      const { date, time, guests } = req.query;
      if (!date || !time || !guests) {
        return res.status(400).json({ success: false, message: 'date, time, and guests are required' });
      }
      const tables = await Reservation.getAvailableTables(date, time, parseInt(guests, 10));
      res.json({ success: true, count: tables.length, data: tables });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/reservations/:id
  async getById(req, res, next) {
    try {
      const reservation = await Reservation.findByReservationId(req.params.id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      res.json({ success: true, data: reservation });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/reservations/:id/status
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const valid = ['pending','confirmed','seated','completed','cancelled','no-show'];
      if (!valid.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      // Find by DB id
      const [rows] = await pool.execute(
        'SELECT * FROM table_reservations WHERE id = ? OR reservation_id = ?',
        [req.params.id, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ success: false, message: 'Reservation not found' });

      const reservation = rows[0];
      const updated = await Reservation.updateStatus(reservation.id, status, req.user?.id);

      // Release the table when reservation is completed/cancelled/no-show
      if (['completed','cancelled','no-show'].includes(status) && reservation.table_id) {
        await Table.updateStatus(reservation.table_id, 'available');
      }
      // Mark table occupied when seated
      if (status === 'seated' && reservation.table_id) {
        await Table.updateStatus(reservation.table_id, 'occupied');
      }

      res.json({ success: true, message: `Reservation ${status}`, data: updated });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = reservationController;
