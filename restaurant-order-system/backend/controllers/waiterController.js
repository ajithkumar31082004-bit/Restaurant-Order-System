const pool = require('../config/database');

const waiterController = {

  // GET /api/waiter/tables
  async getMyTables(req, res, next) {
    try {
      const waiterId = req.user.id;
      const [rows] = await pool.execute(
        `SELECT t.*, wa.shift,
                COUNT(DISTINCT o.id) as active_orders,
                COUNT(DISTINCT wr.id) as pending_requests
         FROM restaurant_tables t
         JOIN waiter_assignments wa ON wa.table_id = t.id AND wa.waiter_id = ?
         LEFT JOIN orders o ON o.table_id = t.id AND o.order_status NOT IN ('Delivered','Cancelled')
         LEFT JOIN waiter_requests wr ON wr.table_id = t.id AND wr.status = 'pending'
         GROUP BY t.id, wa.shift`,
        [waiterId]
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/waiter/requests
  async getRequests(req, res, next) {
    try {
      const waiterId = req.user.id;
      const [rows] = await pool.execute(
        `SELECT wr.*, t.table_number, t.floor
         FROM waiter_requests wr
         JOIN restaurant_tables t ON wr.table_id = t.id
         WHERE (wr.waiter_id = ? OR wr.waiter_id IS NULL)
           AND wr.status != 'resolved'
         ORDER BY wr.created_at ASC`,
        [waiterId]
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/waiter/request  — Customer raises a request
  async createRequest(req, res, next) {
    try {
      const { table_id, request_type, message, order_id } = req.body;
      if (!table_id || !request_type) {
        return res.status(400).json({ success: false, message: 'table_id and request_type are required' });
      }
      const [result] = await pool.execute(
        'INSERT INTO waiter_requests (table_id, order_id, request_type, message) VALUES (?,?,?,?)',
        [table_id, order_id || null, request_type, message || null]
      );
      const [rows] = await pool.execute('SELECT * FROM waiter_requests WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Request sent to waiter', data: rows[0] });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/waiter/requests/:id/resolve
  async resolveRequest(req, res, next) {
    try {
      await pool.execute(
        "UPDATE waiter_requests SET status = 'resolved', waiter_id = ?, resolved_at = NOW() WHERE id = ?",
        [req.user.id, req.params.id]
      );
      res.json({ success: true, message: 'Request resolved' });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/waiter/assignments — admin view all waiter assignments
  async getAllAssignments(req, res, next) {
    try {
      const [rows] = await pool.execute(
        `SELECT wa.*, u.name as waiter_name, u.email as waiter_email,
                t.table_number, t.floor
         FROM waiter_assignments wa
         JOIN users u ON wa.waiter_id = u.id
         JOIN restaurant_tables t ON wa.table_id = t.id
         ORDER BY u.name ASC`
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/waiter/assignments — assign waiter to table
  async createAssignment(req, res, next) {
    try {
      const { waiter_id, table_id, shift } = req.body;
      if (!waiter_id || !table_id) {
        return res.status(400).json({ success: false, message: 'waiter_id and table_id required' });
      }
      await pool.execute(
        'INSERT INTO waiter_assignments (waiter_id, table_id, shift) VALUES (?,?,?) ON DUPLICATE KEY UPDATE shift = ?',
        [waiter_id, table_id, shift || 'morning', shift || 'morning']
      );
      res.status(201).json({ success: true, message: 'Assignment created' });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/waiter/assignments/:id
  async deleteAssignment(req, res, next) {
    try {
      await pool.execute('DELETE FROM waiter_assignments WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Assignment removed' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = waiterController;
