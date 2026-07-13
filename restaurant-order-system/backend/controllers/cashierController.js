const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');

const cashierController = {

  // GET /api/cashier/orders — orders pending payment
  async getPendingPaymentOrders(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT o.*, t.table_number, t.floor,
               p.status as payment_status, p.transaction_id
        FROM orders o
        LEFT JOIN restaurant_tables t ON o.table_id = t.id
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.order_status NOT IN ('Cancelled')
          AND (p.status = 'pending' OR p.status IS NULL)
          AND DATE(o.created_at) = CURDATE()
        ORDER BY o.created_at DESC
      `);
      for (const row of rows) {
        const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [row.id]);
        row.items = items;
      }
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err) { next(err); }
  },

  // POST /api/cashier/bill/:orderId — generate bill details
  async generateBill(req, res, next) {
    try {
      const order = await Order.findByOrderId(req.params.orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const serviceCharge = Math.round(parseFloat(order.subtotal) * 0.10 * 100) / 100;
      const grandTotal = parseFloat(order.total_amount) + serviceCharge;

      res.json({
        success: true,
        data: {
          order,
          bill: {
            subtotal:       parseFloat(order.subtotal),
            gst:            parseFloat(order.gst_amount),
            delivery_charge: parseFloat(order.delivery_charge),
            discount:       parseFloat(order.discount_amount),
            tip:            parseFloat(order.tip_amount),
            service_charge: serviceCharge,
            grand_total:    grandTotal
          }
        }
      });
    } catch (err) { next(err); }
  },

  // GET /api/cashier/invoice/:orderId/pdf
  async downloadInvoice(req, res, next) {
    try {
      const order = await Order.findByOrderId(req.params.orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const serviceCharge = Math.round(parseFloat(order.subtotal) * 0.10 * 100) / 100;
      const grandTotal = parseFloat(order.total_amount) + serviceCharge;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=bill-${order.order_id}.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(22).fillColor('#ff6b35').text('FoodHub Restaurant', { align: 'center' });
      doc.fontSize(10).fillColor('#666').text('Smart Restaurant Management System', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ff6b35').lineWidth(2).stroke();
      doc.moveDown(0.5);

      // Order info
      doc.fontSize(12).fillColor('#333');
      doc.text(`Bill / GST Invoice`, { align: 'center', underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Order ID: ${order.order_id}`, { continued: true });
      doc.text(`  |  Date: ${new Date(order.created_at).toLocaleString('en-IN')}`, { align: 'right' });
      doc.text(`Customer: ${order.customer_name}`, { continued: true });
      doc.text(`  |  Phone: ${order.customer_phone}`, { align: 'right' });
      if (order.table_number) doc.text(`Table: ${order.table_number}`);
      doc.text(`Order Type: ${order.order_type || 'delivery'}`);
      doc.moveDown(0.5);

      // Items table header
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').lineWidth(1).stroke();
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#ff6b35');
      doc.text('Item', 50, doc.y, { width: 250 });
      doc.text('Qty', 300, doc.y - doc.currentLineHeight(), { width: 50 });
      doc.text('Price', 350, doc.y - doc.currentLineHeight(), { width: 80 });
      doc.text('Total', 430, doc.y - doc.currentLineHeight(), { width: 100, align: 'right' });
      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();

      doc.fillColor('#333');
      order.items.forEach(item => {
        doc.moveDown(0.2);
        const y = doc.y;
        doc.text(item.food_name, 50, y, { width: 245 });
        doc.text(`${item.quantity}`, 300, y, { width: 45 });
        doc.text(`₹${item.unit_price}`, 350, y, { width: 75 });
        doc.text(`₹${item.total_price}`, 430, y, { width: 100, align: 'right' });
      });

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.3);

      // Totals
      const addLine = (label, value, color = '#333', bold = false) => {
        doc.fontSize(bold ? 12 : 10).fillColor(color);
        doc.text(label, 350, doc.y, { continued: true });
        doc.text(`₹${parseFloat(value).toFixed(2)}`, { align: 'right' });
      };

      addLine('Subtotal:', order.subtotal);
      addLine(`GST (5%):`, order.gst_amount);
      if (order.delivery_charge > 0) addLine('Delivery:', order.delivery_charge);
      if (order.discount_amount > 0) addLine('Discount:', `-${order.discount_amount}`, '#28a745');
      if (order.tip_amount > 0) addLine('Tip:', order.tip_amount);
      addLine('Service Charge (10%):', serviceCharge);
      doc.moveDown(0.2);
      doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#ff6b35').lineWidth(1.5).stroke();
      doc.moveDown(0.2);
      addLine('GRAND TOTAL:', grandTotal, '#ff6b35', true);

      doc.moveDown(0.5);
      doc.text(`Payment: ${order.payment_method}  |  Status: ${order.payment_status}`, { align: 'center', color: '#666' });
      doc.moveDown(1);
      doc.fontSize(9).fillColor('#999').text('Thank you for dining with us! Please visit again.', { align: 'center' });

      doc.end();
    } catch (err) { next(err); }
  },

  // POST /api/cashier/split-bill
  async splitBill(req, res, next) {
    try {
      const { order_id, splits } = req.body;
      // splits: [{ person: "Alice", item_ids: [1,2], custom_amount: 250 }]
      if (!order_id || !splits?.length) {
        return res.status(400).json({ success: false, message: 'order_id and splits required' });
      }
      const order = await Order.findByOrderId(order_id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const splitBills = splits.map(s => ({
        person: s.person,
        items: s.item_ids
          ? order.items.filter(i => s.item_ids.includes(i.id))
          : [],
        amount: s.custom_amount || (order.total_amount / splits.length)
      }));

      res.json({ success: true, data: { order_id, split_count: splits.length, bills: splitBills } });
    } catch (err) { next(err); }
  },

  // POST /api/cashier/refund
  async processRefund(req, res, next) {
    try {
      const { order_id, reason } = req.body;
      if (!order_id) return res.status(400).json({ success: false, message: 'order_id required' });

      await pool.execute(
        "UPDATE orders SET order_status = 'Cancelled', payment_status = 'refunded' WHERE order_id = ?",
        [order_id]
      );
      await pool.execute(
        "UPDATE payments SET status = 'refunded' WHERE order_id = (SELECT id FROM orders WHERE order_id = ? LIMIT 1)",
        [order_id]
      );

      res.json({ success: true, message: `Refund processed for ${order_id}` });
    } catch (err) { next(err); }
  }
};

module.exports = cashierController;
