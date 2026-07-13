const pool = require('../config/database');

const analyticsController = {

  // GET /api/analytics/revenue?period=daily|weekly|monthly
  async getRevenue(req, res, next) {
    try {
      const { period = 'daily' } = req.query;
      let query;

      if (period === 'monthly') {
        query = `SELECT DATE_FORMAT(created_at,'%Y-%m') as label,
                   SUM(total_amount) as revenue, COUNT(*) as orders
                 FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                   AND order_status != 'Cancelled'
                 GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY label ASC`;
      } else if (period === 'weekly') {
        query = `SELECT DATE_FORMAT(created_at,'%Y-W%u') as label,
                   SUM(total_amount) as revenue, COUNT(*) as orders
                 FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
                   AND order_status != 'Cancelled'
                 GROUP BY DATE_FORMAT(created_at,'%Y-W%u') ORDER BY label ASC`;
      } else {
        query = `SELECT DATE(created_at) as label,
                   SUM(total_amount) as revenue, COUNT(*) as orders
                 FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                   AND order_status != 'Cancelled'
                 GROUP BY DATE(created_at) ORDER BY label ASC`;
      }

      const [rows] = await pool.execute(query);
      res.json({ success: true, period, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/peak-hours
  async getPeakHours(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT HOUR(created_at) as hour, COUNT(*) as orders,
               SUM(total_amount) as revenue
        FROM orders WHERE order_status != 'Cancelled'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY HOUR(created_at) ORDER BY hour ASC
      `);
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/popular-dishes
  async getPopularDishes(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const [rows] = await pool.query(
        `SELECT oi.food_name, SUM(oi.quantity) as total_sold,
                SUM(oi.total_price) as total_revenue,
                f.image, f.category_id, c.name as category_name
         FROM order_items oi
         LEFT JOIN foods f ON oi.food_id = f.id
         LEFT JOIN categories c ON f.category_id = c.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.order_status != 'Cancelled'
         GROUP BY oi.food_name, f.image, f.category_id, c.name ORDER BY total_sold DESC LIMIT ?`,
        [limit]
      );
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/table-utilization
  async getTableUtilization(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT t.table_number, t.table_type, t.floor,
               COUNT(o.id) as total_orders,
               COALESCE(SUM(o.total_amount), 0) as total_revenue,
               ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.created_at, o.updated_at)), 1) as avg_duration_min
        FROM restaurant_tables t
        LEFT JOIN orders o ON o.table_id = t.id
          AND o.order_type = 'dine-in'
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY t.id ORDER BY total_orders DESC
      `);
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/reservation-trend
  async getReservationTrend(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT DATE(reservation_date) as date,
               COUNT(*) as total,
               SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
               SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
               SUM(CASE WHEN status='no-show' THEN 1 ELSE 0 END) as no_show,
               SUM(guest_count) as total_guests
        FROM table_reservations
        WHERE reservation_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(reservation_date) ORDER BY date ASC
      `);
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/order-types
  async getOrderTypes(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT order_type, COUNT(*) as count, SUM(total_amount) as revenue
        FROM orders WHERE order_status != 'Cancelled'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY order_type
      `);
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/customer-satisfaction
  async getCustomerSatisfaction(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT DATE(created_at) as date,
               ROUND(AVG(food_rating), 2) as avg_food,
               ROUND(AVG(service_rating), 2) as avg_service,
               ROUND(AVG(ambience_rating), 2) as avg_ambience,
               ROUND(AVG(overall_rating), 2) as avg_overall,
               COUNT(*) as total_reviews
        FROM feedback WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at) ORDER BY date ASC
      `);
      const [overall] = await pool.execute(`
        SELECT ROUND(AVG(food_rating), 2) as avg_food,
               ROUND(AVG(service_rating), 2) as avg_service,
               ROUND(AVG(ambience_rating), 2) as avg_ambience,
               ROUND(AVG(overall_rating), 2) as avg_overall,
               COUNT(*) as total,
               SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
               SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative
        FROM feedback
      `);
      res.json({ success: true, trend: rows, summary: overall[0] });
    } catch (err) { next(err); }
  },

  // GET /api/analytics/summary — main dashboard numbers
  async getSummary(req, res, next) {
    try {
      const [orders] = await pool.execute(`
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN DATE(created_at)=CURDATE() THEN 1 ELSE 0 END) as today_orders,
          COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN total_amount END), 0) as today_revenue,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          SUM(CASE WHEN order_status='Pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN order_type='dine-in' AND DATE(created_at)=CURDATE() THEN 1 ELSE 0 END) as today_dine_in,
          SUM(CASE WHEN order_type='delivery' AND DATE(created_at)=CURDATE() THEN 1 ELSE 0 END) as today_delivery
        FROM orders`
      );
      const [tables]   = await pool.execute("SELECT COUNT(*) as occupied FROM restaurant_tables WHERE status='occupied'");
      const [kitchen]  = await pool.execute("SELECT COUNT(*) as queue FROM kitchen_orders WHERE status NOT IN ('served','cancelled')");
      const [res_today] = await pool.execute("SELECT COUNT(*) as today FROM table_reservations WHERE reservation_date=CURDATE() AND status IN ('pending','confirmed')");
      const [customers] = await pool.execute("SELECT COUNT(*) as total FROM users WHERE role='customer'");
      const [lowStock]  = await pool.execute('SELECT COUNT(*) as count FROM inventory WHERE quantity <= low_stock_threshold');

      res.json({
        success: true,
        data: {
          ...orders[0],
          occupied_tables: tables[0].occupied,
          kitchen_queue: kitchen[0].queue,
          today_reservations: res_today[0].today,
          total_customers: customers[0].total,
          low_stock_alerts: lowStock[0].count
        }
      });
    } catch (err) { next(err); }
  }
};

module.exports = analyticsController;
