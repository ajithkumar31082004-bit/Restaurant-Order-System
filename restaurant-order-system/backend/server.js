const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const couponRoutes = require('./routes/couponRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "images.unsplash.com", "http://localhost:5000", "http://127.0.0.1:5000"],
      connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000"]
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
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Restaurant Order System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      foods: '/api/foods',
      categories: '/api/categories',
      orders: '/api/orders',
      coupons: '/api/coupons',
      admin: '/api/admin'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  
  // Clean URL mapping for frontend routes
  const cleanPath = req.path.replace(/\/$/, ''); // Remove trailing slash
  const pageMap = {
    '/menu': '../frontend/pages/menu.html',
    '/login': '../frontend/pages/login.html',
    '/register': '../frontend/pages/register.html',
    '/cart': '../frontend/pages/cart.html',
    '/checkout': '../frontend/pages/checkout.html',
    '/profile': '../frontend/pages/profile.html',
    '/track-order': '../frontend/pages/track-order.html',
    '/contact': '../frontend/pages/contact.html',
    '/order-success': '../frontend/pages/order-success.html',
    '/admin': '../frontend/pages/admin/dashboard.html',
    '/admin/dashboard': '../frontend/pages/admin/dashboard.html'
  };

  if (pageMap[cleanPath]) {
    return res.sendFile(path.join(__dirname, pageMap[cleanPath]));
  }

  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

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
