const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes        = require('./routes/authRoutes');
const foodRoutes        = require('./routes/foodRoutes');
const categoryRoutes    = require('./routes/categoryRoutes');
const orderRoutes       = require('./routes/orderRoutes');
const couponRoutes      = require('./routes/couponRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const userRoutes        = require('./routes/userRoutes');
// New v2 routes
const reservationRoutes = require('./routes/reservationRoutes');
const tableRoutes       = require('./routes/tableRoutes');
const kitchenRoutes     = require('./routes/kitchenRoutes');
const waiterRoutes      = require('./routes/waiterRoutes');
const inventoryRoutes   = require('./routes/inventoryRoutes');
const analyticsRoutes   = require('./routes/analyticsRoutes');
const cashierRoutes     = require('./routes/cashierRoutes');
const aiRoutes          = require('./routes/aiRoutes');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "images.unsplash.com", "*.amazonaws.com", "http://localhost:5000", "http://127.0.0.1:5000"],
      connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000"],
      upgradeInsecureRequests: null
    }
  }
}));

app.use(cors({
  origin: [config.frontendUrl, 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'null'],
  credentials: true
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  // Skip rate limiting for localhost (test scripts, dev tools)
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'FoodHub — Smart Restaurant Management API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      foods: '/api/foods',
      categories: '/api/categories',
      orders: '/api/orders',
      coupons: '/api/coupons',
      admin: '/api/admin',
      reservations: '/api/reservations',
      tables: '/api/tables',
      kitchen: '/api/kitchen',
      waiter: '/api/waiter',
      inventory: '/api/inventory',
      analytics: '/api/analytics',
      cashier: '/api/cashier',
      ai: '/api/ai'
    }
  });
});

app.use('/api/auth',         authRoutes);
app.use('/api/foods',        foodRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/coupons',      couponRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/users',        userRoutes);
// v2 routes
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables',       tableRoutes);
app.use('/api/kitchen',      kitchenRoutes);
app.use('/api/waiter',       waiterRoutes);
app.use('/api/inventory',    inventoryRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/cashier',      cashierRoutes);
app.use('/api/ai',           aiRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  
  // Clean URL mapping for frontend routes
  const cleanPath = req.path.replace(/\/$/, ''); // Remove trailing slash
  const pageMap = {
    // Existing pages
    '/menu':            '/pages/menu.html',
    '/login':           '/pages/login.html',
    '/register':        '/pages/register.html',
    '/cart':            '/pages/cart.html',
    '/checkout':        '/pages/checkout.html',
    '/profile':         '/pages/profile.html',
    '/track-order':     '/pages/track-order.html',
    '/contact':         '/pages/contact.html',
    '/order-success':   '/pages/order-success.html',
    // New customer pages
    '/reservation':     '/pages/reservation.html',
    '/reservation-confirm': '/pages/reservation-confirm.html',
    '/table-order':     '/pages/table-order.html',
    '/bill':            '/pages/bill.html',
    '/feedback':        '/pages/feedback.html',
    '/loyalty':         '/pages/loyalty.html',
    '/group-order':     '/pages/group-order.html',
    '/scheduled-order': '/pages/scheduled-order.html',
    // Admin pages
    '/admin':                   '/pages/admin/dashboard.html',
    '/admin/dashboard':         '/pages/admin/dashboard.html',
    '/admin/floor-map':         '/pages/admin/floor-map.html',
    '/admin/tables':            '/pages/admin/tables.html',
    '/admin/reservations':      '/pages/admin/reservations.html',
    '/admin/kitchen':           '/pages/admin/kitchen.html',
    '/admin/waiter':            '/pages/admin/waiter.html',
    '/admin/cashier':           '/pages/admin/cashier.html',
    '/admin/inventory':         '/pages/admin/inventory.html',
    '/admin/analytics':         '/pages/admin/analytics.html',
    '/admin/employees':         '/pages/admin/employees.html',
    '/admin/feedback':          '/pages/admin/feedback.html',
    '/admin/waitlist':          '/pages/admin/waitlist.html',
    '/admin/ai-insights':       '/pages/admin/ai-insights.html',
  };

  if (pageMap[cleanPath]) {
    return res.redirect(pageMap[cleanPath]);
  }

  // Default: redirect root to the main page
  if (cleanPath === '' || cleanPath === '/') {
    return res.redirect('/pages/index.html');
  }

  res.redirect('/pages/index.html');
});

// ── Error Handler (must be after all routes) ──────────────────
app.use(errorHandler);

// ── Crash Protection ──────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err.message);
});

const PORT = config.port;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} [${config.nodeEnv}]`);
  const pool = require('./config/database');
  try {
    await pool.execute('SELECT 1');
    console.log('MySQL connected successfully');
  } catch (e) {
    console.error('MySQL connection failed:', e.message);
  }
});

module.exports = app;
