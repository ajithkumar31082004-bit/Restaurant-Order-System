const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { sendOrderToSQS, sendOrderNotification } = require('../aws/sqs');
const PDFDocument = require('pdfkit');

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

      if (coupon) {
        await Coupon.incrementUsage(coupon.id);
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
      const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

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

  async downloadInvoice(req, res, next) {
    try {
      const order = await Order.findByOrderId(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.order_id}.pdf`);
      doc.pipe(res);

      doc.fontSize(20).text('Restaurant Order Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Order ID: ${order.order_id}`);
      doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`);
      doc.text(`Customer: ${order.customer_name}`);
      doc.text(`Phone: ${order.customer_phone}`);
      doc.text(`Address: ${order.delivery_address}, ${order.city} - ${order.pincode}`);
      doc.moveDown();

      doc.text('Items:', { underline: true });
      order.items.forEach((item) => {
        doc.text(`${item.food_name} x ${item.quantity} - Rs ${item.total_price}`);
      });

      doc.moveDown();
      doc.text(`Subtotal: Rs ${order.subtotal}`);
      doc.text(`GST: Rs ${order.gst_amount}`);
      doc.text(`Delivery: Rs ${order.delivery_charge}`);
      if (order.discount_amount > 0) doc.text(`Discount: -Rs ${order.discount_amount}`);
      if (order.tip_amount > 0) doc.text(`Tip: Rs ${order.tip_amount}`);
      doc.fontSize(14).text(`Total: Rs ${order.total_amount}`, { bold: true });
      doc.text(`Payment: ${order.payment_method}`);
      doc.text(`Status: ${order.order_status}`);

      doc.end();
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

      const statusSteps = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Packed', 'Out for Delivery', 'Delivered'];
      const currentIndex = statusSteps.indexOf(order.order_status);

      const timeline = statusSteps.map((step, index) => ({
        status: step,
        completed: index <= currentIndex,
        active: index === currentIndex
      }));

      res.json({
        success: true,
        data: {
          orderId: order.order_id,
          currentStatus: order.order_status,
          estimatedDelivery: order.estimated_delivery,
          paymentMethod: order.payment_method,
          timeline
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = orderController;
