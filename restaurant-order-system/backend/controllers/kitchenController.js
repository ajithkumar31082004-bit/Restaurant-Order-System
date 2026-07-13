const pool = require('../config/database');

const kitchenController = {

  // GET /api/kitchen/orders
  async getOrders(req, res, next) {
    try {
      const { status } = req.query;
      let query = `
        SELECT ko.*, o.order_id, o.order_type, o.customer_name, o.customer_phone,
               t.table_number, t.floor,
               u.name as chef_name,
               GROUP_CONCAT(
                 CONCAT(oi.food_name,' x',oi.quantity) SEPARATOR ' | '
               ) as items_summary,
               JSON_ARRAYAGG(JSON_OBJECT(
                 'name', oi.food_name,
                 'qty', oi.quantity,
                 'price', oi.unit_price
               )) as items,
               TIMESTAMPDIFF(MINUTE, ko.created_at, NOW()) as minutes_waiting
        FROM kitchen_orders ko
        JOIN orders o ON ko.order_id = o.id
        LEFT JOIN restaurant_tables t ON o.table_id = t.id
        LEFT JOIN users u ON ko.assigned_chef_id = u.id
        JOIN order_items oi ON oi.order_id = o.id
        WHERE 1=1`;
      const params = [];

      if (status) {
        query += ' AND ko.status = ?';
        params.push(status);
      } else {
        query += " AND ko.status NOT IN ('served','cancelled')";
      }

      query += ' GROUP BY ko.id ORDER BY ko.priority DESC, ko.created_at ASC';

      const [rows] = await pool.execute(query, params);
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/kitchen/orders/:id/status
  async updateStatus(req, res, next) {
    try {
      const { status, estimated_minutes } = req.body;
      const valid = ['accepted','preparing','ready','served','cancelled'];
      if (!valid.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid kitchen status' });
      }

      const fields = ['status = ?'];
      const values = [status];

      if (status === 'accepted') { fields.push('accepted_at = NOW()'); }
      if (status === 'ready')    { fields.push('ready_at = NOW()'); }
      if (status === 'served')   { fields.push('served_at = NOW()'); }
      if (estimated_minutes)     { fields.push('estimated_minutes = ?'); values.push(estimated_minutes); }
      if (req.user?.id && status === 'accepted') {
        fields.push('assigned_chef_id = ?');
        values.push(req.user.id);
      }

      values.push(req.params.id);
      await pool.execute(
        `UPDATE kitchen_orders SET ${fields.join(', ')} WHERE id = ?`, values
      );

      // Mirror status to the parent order
      const statusMap = {
        accepted: 'Confirmed',
        preparing: 'Preparing',
        ready: 'Cooking',
        served: 'Delivered'
      };
      if (statusMap[status]) {
        const [ko] = await pool.execute('SELECT order_id FROM kitchen_orders WHERE id = ?', [req.params.id]);
        if (ko[0]) {
          await pool.execute(
            'UPDATE orders SET order_status = ? WHERE id = ?',
            [statusMap[status], ko[0].order_id]
          );
        }
      }

      const [updated] = await pool.execute('SELECT * FROM kitchen_orders WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: `Kitchen order marked ${status}`, data: updated[0] });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/kitchen/stats
  async getStats(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT
          COUNT(*) as total_today,
          SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) as new_orders,
          SUM(CASE WHEN status='preparing' THEN 1 ELSE 0 END) as preparing,
          SUM(CASE WHEN status='ready' THEN 1 ELSE 0 END) as ready,
          SUM(CASE WHEN status='served' THEN 1 ELSE 0 END) as served,
          SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
          ROUND(AVG(CASE WHEN served_at IS NOT NULL
            THEN TIMESTAMPDIFF(MINUTE, created_at, served_at) END), 1) as avg_prep_minutes,
          SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, created_at, NOW()) > estimated_minutes
            AND status NOT IN ('served','cancelled') THEN 1 ELSE 0 END) as \`delayed\`
        FROM kitchen_orders WHERE DATE(created_at) = CURDATE()
      `);
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = kitchenController;
