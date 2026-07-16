const pool = require('../config/database');
const config = require('../config/config');

const Order = {
  generateOrderId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `ORD${num}${Date.now().toString().slice(-4)}`;
  },

  async create(orderData, items) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (order_id, user_id, customer_name, customer_phone, customer_email,
         delivery_address, city, pincode, subtotal, gst_amount, delivery_charge, tip_amount,
         discount_amount, total_amount, coupon_code, payment_method, order_notes, estimated_delivery,
         order_type, table_id, waiter_id, scheduled_at, service_charge)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.order_id, orderData.user_id || null, orderData.customer_name,
          orderData.customer_phone, orderData.customer_email || null,
          orderData.delivery_address, orderData.city, orderData.pincode,
          orderData.subtotal, orderData.gst_amount, orderData.delivery_charge,
          orderData.tip_amount, orderData.discount_amount, orderData.total_amount,
          orderData.coupon_code || null, orderData.payment_method,
          orderData.order_notes || null, orderData.estimated_delivery,
          orderData.order_type || 'delivery', orderData.table_id || null,
          orderData.waiter_id || null, orderData.scheduled_at || null,
          orderData.service_charge || 0.00
        ]
      );

      const orderDbId = orderResult.insertId;

      for (const item of items) {
        await connection.execute(
          'INSERT INTO order_items (order_id, food_id, food_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
          [orderDbId, item.foodId || item.id || null, item.name, item.qty, item.price, item.qty * item.price]
        );
      }

      await connection.execute(
        'INSERT INTO payments (order_id, amount, payment_method, status) VALUES (?, ?, ?, ?)',
        [orderDbId, orderData.total_amount, orderData.payment_method, orderData.payment_method === 'COD' ? 'pending' : 'completed']
      );

      // Auto-create a kitchen_orders entry so the Chef KDS, Waiter portal,
      // and Cashier station can immediately see the new order.
      let tableNumber = null;
      if (orderData.table_id) {
        try {
          const [tableRows] = await connection.execute(
            'SELECT table_number FROM restaurant_tables WHERE id = ?',
            [orderData.table_id]
          );
          if (tableRows[0]) tableNumber = tableRows[0].table_number;
        } catch (e) { /* non-critical */ }
      }

      await connection.execute(
        `INSERT INTO kitchen_orders
           (order_id, order_ref, table_number, order_type, status, priority, notes)
         VALUES (?, ?, ?, ?, 'new', 'normal', ?)`,
        [
          orderDbId,
          orderData.order_id,
          tableNumber,
          orderData.order_type || 'delivery',
          orderData.order_notes || null
        ]
      );

      await connection.commit();
      return this.findByOrderId(orderData.order_id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async findByOrderId(orderId) {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (!orders[0]) return null;

    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orders[0].id]
    );

    return { ...orders[0], items };
  },

  async findById(dbId) {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [dbId]);
    if (!orders[0]) return null;

    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orders[0].id]
    );

    return { ...orders[0], items };
  },

  async getAll(filters = {}) {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.status) {
      query += ' AND order_status = ?';
      params.push(filters.status);
    }
    if (filters.date) {
      query += ' AND DATE(created_at) = ?';
      params.push(filters.date);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit, 10));
    }

    const [rows] = await pool.execute(query, params);

    for (const order of rows) {
      const [items] = await pool.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return rows;
  },

  async updateStatus(orderId, status, extra = {}) {
    const fields = ['order_status = ?'];
    const values = [status];

    if (extra.sqs_message_id) {
      fields.push('sqs_message_id = ?');
      values.push(extra.sqs_message_id);
    }
    if (extra.dynamodb_synced !== undefined) {
      fields.push('dynamodb_synced = ?');
      values.push(extra.dynamodb_synced);
    }

    values.push(orderId);
    await pool.execute(
      `UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`,
      values
    );
    return this.findByOrderId(orderId);
  },

  async delete(orderId) {
    const [result] = await pool.execute('DELETE FROM orders WHERE order_id = ?', [orderId]);
    return result.affectedRows > 0;
  },

  async getStats() {
    const [totals] = await pool.execute(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END) as delivered_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0) as today_revenue
      FROM orders
    `);

    const [customers] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE role = 'customer'"
    );

    const [dailyRevenue] = await pool.execute(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders
      FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at) ORDER BY date ASC
    `);

    const [monthlyRevenue] = await pool.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as revenue, COUNT(*) as orders
      FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC
    `);

    const [peakHours] = await pool.execute(`
      SELECT HOUR(created_at) as hour, COUNT(*) as orders
      FROM orders GROUP BY HOUR(created_at) ORDER BY hour ASC
    `);

    return {
      ...totals[0],
      total_customers: customers[0].total,
      daily_revenue: dailyRevenue,
      monthly_revenue: monthlyRevenue,
      peak_hours: peakHours
    };
  },

  calculateTotals(items, options = {}) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const gstAmount = Math.round(subtotal * config.gstRate * 100) / 100;
    const deliveryCharge = subtotal >= config.freeDeliveryMin ? 0 : config.deliveryCharge;
    const tipAmount = options.tip || 0;
    let discountAmount = 0;

    if (options.coupon) {
      if (options.coupon.discount_type === 'percentage') {
        discountAmount = Math.round(subtotal * (options.coupon.discount_value / 100) * 100) / 100;
        if (options.coupon.max_discount) {
          discountAmount = Math.min(discountAmount, options.coupon.max_discount);
        }
      } else {
        discountAmount = options.coupon.discount_value;
      }
    }

    const total = Math.max(0, subtotal + gstAmount + deliveryCharge + tipAmount - discountAmount);

    return { subtotal, gstAmount, deliveryCharge, tipAmount, discountAmount, total };
  }
};

module.exports = Order;
