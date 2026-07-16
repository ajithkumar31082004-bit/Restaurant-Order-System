const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Table = require('../models/Table');
const { sendOrderToSQS, sendOrderNotification } = require('../aws/sqs');
const { uploadToS3, getPresignedUrl, objectExists } = require('../aws/s3');
const PDFDocument = require('pdfkit');

// ── Helper: build the PDF in memory ───────────────────────────────────
function buildPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('🍽  FoodHub Restaurant', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Tax Invoice / Bill of Supply', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Order details
    doc.font('Helvetica-Bold').text('Order Details', { underline: true });
    doc.font('Helvetica');
    doc.text(`Order ID   : ${order.order_id}`);
    doc.text(`Date       : ${new Date(order.created_at).toLocaleString('en-IN')}`);
    doc.text(`Order Type : ${(order.order_type || 'delivery').toUpperCase()}`);
    doc.text(`Status     : ${order.order_status}`);
    doc.moveDown();

    // Customer details
    doc.font('Helvetica-Bold').text('Customer Details', { underline: true });
    doc.font('Helvetica');
    doc.text(`Name       : ${order.customer_name}`);
    doc.text(`Phone      : ${order.customer_phone}`);
    if (order.customer_email) doc.text(`Email      : ${order.customer_email}`);
    if (order.order_type !== 'dine-in') {
      doc.text(`Address    : ${order.delivery_address}, ${order.city} - ${order.pincode}`);
    } else if (order.table_id) {
      doc.text(`Table      : T-${String(order.table_id).padStart(2, '0')}`);
    }
    doc.moveDown();

    // Items table
    doc.font('Helvetica-Bold').text('Items Ordered', { underline: true });
    doc.font('Helvetica');
    order.items.forEach((item, i) => {
      doc.text(
        `${i + 1}. ${item.food_name}  ×${item.quantity}` +
        `    @₹${item.unit_price || (item.total_price / item.quantity).toFixed(2)}` +
        `    = ₹${item.total_price}`
      );
    });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    doc.text(`Subtotal          : ₹${order.subtotal}`);
    doc.text(`GST (5%)          : ₹${order.gst_amount}`);
    if (order.delivery_charge > 0)
      doc.text(`Delivery Charge   : ₹${order.delivery_charge}`);
    if (order.service_charge > 0)
      doc.text(`Service Charge    : ₹${order.service_charge}`);
    if (order.discount_amount > 0)
      doc.text(`Discount          : -₹${order.discount_amount}`);
    if (order.tip_amount > 0)
      doc.text(`Tip               : ₹${order.tip_amount}`);
    doc.font('Helvetica-Bold').fontSize(14);
    doc.text(`GRAND TOTAL       : ₹${order.total_amount}`);
    doc.font('Helvetica').fontSize(12);
    doc.text(`Payment Method    : ${order.payment_method}`);
    doc.moveDown();

    // Footer
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).text('Thank you for dining with FoodHub! 🙏', { align: 'center' });
    doc.text('For support: info@foodhub.com  |  +91 98765 43210', { align: 'center' });

    doc.end();
  });
}

// ── Background Uploader helper ────────────────────────────────────────
async function uploadInvoiceBackground(order) {
  const s3Key = `invoices/invoice-${order.order_id}.pdf`;
  try {
    const alreadyUploaded = await objectExists(s3Key);
    if (!alreadyUploaded) {
      const pdfBuffer = await buildPdfBuffer(order);
      await uploadToS3(pdfBuffer, s3Key, 'application/pdf');
      console.log(`[Auto-Trigger] Invoice successfully uploaded to S3: ${s3Key}`);
    } else {
      console.log(`[Auto-Trigger] Invoice already exists in S3, skipping: ${s3Key}`);
    }
  } catch (err) {
    console.error(`[Auto-Trigger] S3 invoice upload failed in background:`, err.message);
  }
}

const orderController = {
  async create(req, res, next) {
    try {
      const {
        name, phone, email, address, city, pincode,
        items, payment, couponCode, tip, orderNotes,
        order_type, table_id, scheduled_at, service_charge
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
      }

      let coupon = null;
      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

      if (couponCode) {
        const validation = await Coupon.validate(couponCode, subtotal);
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.message });
        }
        coupon = validation.coupon;
      }

      const totals = Order.calculateTotals(items, { tip: tip || 0, coupon });
      const orderId = Order.generateOrderId();
      const estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000);

      const orderData = {
        order_id: orderId,
        user_id: req.user?.id || null,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        delivery_address: address,
        city,
        pincode,
        subtotal: totals.subtotal,
        gst_amount: totals.gstAmount,
        delivery_charge: totals.deliveryCharge,
        tip_amount: totals.tipAmount,
        discount_amount: totals.discountAmount,
        total_amount: totals.total,
        coupon_code: couponCode || null,
        payment_method: payment || 'COD',
        order_notes: orderNotes || null,
        estimated_delivery: estimatedDelivery,
        order_type: order_type || 'delivery',
        table_id: table_id ? parseInt(table_id, 10) : null,
        scheduled_at: scheduled_at || null,
        service_charge: service_charge ? parseFloat(service_charge) : 0.00
      };

      const order = await Order.create(orderData, items);

      // Auto-mark the table as occupied for dine-in orders (server-side, no auth needed from guest)
      if ((order_type === 'dine-in' || order_type === 'table') && table_id) {
        try {
          await Table.updateStatus(parseInt(table_id, 10), 'occupied');
        } catch (tableErr) {
          console.warn('Table status update failed (non-critical):', tableErr.message);
        }
      }

      if (coupon) {
        await Coupon.incrementUsage(coupon.id);
      }

      // Award loyalty points to authenticated user (10 points per ₹100 spent)
      if (req.user?.id) {
        try {
          const pool = require('../config/database');
          const pointsEarned = Math.floor(totals.total * 0.1);
          if (pointsEarned > 0) {
            await pool.execute(
              'UPDATE users SET rewards_points = rewards_points + ? WHERE id = ?',
              [pointsEarned, req.user.id]
            );
            console.log(`[Loyalty] Awarded ${pointsEarned} points to user ${req.user.id}`);
          }
        } catch (loyaltyErr) {
          console.error('Failed to award loyalty points:', loyaltyErr.message);
        }
      }

      const sqsPayload = {
        orderId,
        userId: req.user?.id || null,
        name,
        phone,
        email,
        address: `${address}, ${city} - ${pincode}`,
        items,
        total: totals.total,
        payment: payment || 'COD',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        order_type: order_type || 'delivery'
      };

      try {
        const sqsResponse = await sendOrderToSQS(sqsPayload);
        await Order.updateStatus(orderId, 'Pending', {
          sqs_message_id: sqsResponse.MessageId
        });
      } catch (awsErr) {
        console.error('SQS send failed (order saved in MySQL):', awsErr.message);
      }

      try {
        await sendOrderNotification({
          orderId,
          name,
          phone,
          email,
          total: totals.total,
          status: 'Pending',
          items
        });
      } catch (snsErr) {
        console.error('SNS notification failed:', snsErr.message);
      }

      // Asynchronously trigger PDF generation and upload to S3 in the background
      uploadInvoiceBackground(order).catch(err => {
        console.error('Background S3 upload trigger failed:', err.message);
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: {
          orderId,
          order,
          estimatedDelivery,
          totals
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const filters = {};
      if (req.user.role !== 'admin') {
        filters.user_id = req.user.id;
      }
      if (req.query.status) filters.status = req.query.status;
      if (req.query.date) filters.date = req.query.date;
      if (req.query.limit) filters.limit = req.query.limit;

      const orders = await Order.getAll(filters);
      res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const order = await Order.findByOrderId(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready', 'Served', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const order = await Order.updateStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, message: 'Order status updated', data: order });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await Order.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      res.json({ success: true, message: 'Order cancelled' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate invoice PDF, store it in S3, and redirect to a 1-hour pre-signed download URL.
   * Falls back to direct stream if S3 is not configured.
   */
  async downloadInvoice(req, res, next) {
    try {
      const order = await Order.findByOrderId(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const s3Key = `invoices/invoice-${order.order_id}.pdf`;

      // ── Try S3 upload ──────────────────────────────────────────────────────
      try {
        // Re-use existing S3 object to avoid regenerating the same invoice
        const alreadyUploaded = await objectExists(s3Key);
        if (!alreadyUploaded) {
          const pdfBuffer = await buildPdfBuffer(order);
          await uploadToS3(pdfBuffer, s3Key, 'application/pdf');
          console.log(`Invoice uploaded to S3: ${s3Key}`);
        } else {
          console.log(`Invoice already in S3: ${s3Key}`);
        }

        const presignedUrl = await getPresignedUrl(s3Key, 3600); // 1 hour
        return res.redirect(presignedUrl);
      } catch (s3Err) {
        // ── S3 not configured or failed — fall back to direct stream ─────────
        console.warn('S3 invoice upload failed, falling back to stream:', s3Err.message);
        const pdfBuffer = await buildPdfBuffer(order);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.order_id}.pdf`);
        return res.send(pdfBuffer);
      }
    } catch (error) {
      next(error);
    }
  },

  async trackOrder(req, res, next) {
    try {
      const order = await Order.findByOrderId(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const isDineIn = order.order_type === 'dine-in' || order.order_type === 'table';

      const deliverySteps = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Packed', 'Out for Delivery', 'Delivered'];
      const dineInSteps   = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready', 'Served'];

      const statusSteps = isDineIn ? dineInSteps : deliverySteps;
      const currentIndex = statusSteps.indexOf(order.order_status);

      const timeline = statusSteps.map((step, index) => ({
        status: step,
        completed: index <= currentIndex,
        active: index === currentIndex
      }));

      // Fetch actual table_number for dine-in orders
      let tableNumber = null;
      if (isDineIn && order.table_id) {
        try {
          const pool = require('../config/database');
          const [tableRows] = await pool.execute(
            'SELECT table_number FROM restaurant_tables WHERE id = ?',
            [order.table_id]
          );
          if (tableRows[0]) tableNumber = tableRows[0].table_number;
        } catch (e) { /* non-critical */ }
      }

      res.json({
        success: true,
        data: {
          orderId: order.order_id,
          currentStatus: order.order_status,
          estimatedDelivery: order.estimated_delivery,
          paymentMethod: order.payment_method,
          orderType: order.order_type || 'delivery',
          tableId: order.table_id || null,
          tableNumber: tableNumber,
          timeline
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = orderController;
