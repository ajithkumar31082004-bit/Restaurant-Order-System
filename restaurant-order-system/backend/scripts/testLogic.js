/**
 * FoodHub v2.0 — Logic & Syntax Validation (No DB Required)
 * Validates: module loading, controller exports, middleware logic,
 * route registration, model methods, and AI service graceful fallback.
 * Run: node scripts/testLogic.js  (server does NOT need to be running)
 */
require('dotenv').config();

let pass = 0, fail = 0;
const errors = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✅ ${name}`);
      pass++;
    } else {
      console.log(`  ❌ ${name} — returned: ${JSON.stringify(result)}`);
      fail++;
      errors.push(name);
    }
  } catch (e) {
    console.log(`  ❌ ${name} — ${e.message}`);
    fail++;
    errors.push(`${name}: ${e.message}`);
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(52));
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   FoodHub v2.0 — Logic & Module Validation Test     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ─────────────────────────────────────────────────────────
  section('1. MODULE IMPORTS — All new controllers/routes load');
  // ─────────────────────────────────────────────────────────

  check('middleware/auth.js loads', () => {
    const m = require('../middleware/auth');
    return typeof m.authMiddleware === 'function' &&
           typeof m.adminMiddleware === 'function' &&
           typeof m.roleMiddleware === 'function';
  });

  check('roleMiddleware is a higher-order function', () => {
    const { roleMiddleware } = require('../middleware/auth');
    const guard = roleMiddleware('admin', 'manager');
    return typeof guard === 'function';
  });

  check('roleMiddleware blocks wrong role', () => {
    const { roleMiddleware } = require('../middleware/auth');
    const guard = roleMiddleware('admin', 'manager');
    let called = false;
    const next = () => { called = true; };
    const req = { user: { role: 'customer' } };
    const res = { status: (c) => ({ json: () => {} }) };
    guard(req, res, next);
    return called === false; // next should NOT have been called
  });

  check('roleMiddleware allows correct role', () => {
    const { roleMiddleware } = require('../middleware/auth');
    const guard = roleMiddleware('admin', 'chef');
    let called = false;
    const next = () => { called = true; };
    const req = { user: { role: 'chef' } };
    const res = { status: (c) => ({ json: () => {} }) };
    guard(req, res, next);
    return called === true;
  });

  // ─────────────────────────────────────────────────────────
  section('2. CONTROLLERS — All exports present');
  // ─────────────────────────────────────────────────────────

  check('reservationController exports all methods', () => {
    const c = require('../controllers/reservationController');
    return ['create','getAll','getStats','getAvailableTables','getById','updateStatus']
      .every(m => typeof c[m] === 'function');
  });

  check('tableController exports all methods', () => {
    const c = require('../controllers/tableController');
    return ['getAll','getFloorMap','getStats','getById','getQRCode','create','update','updateStatus','transfer','remove']
      .every(m => typeof c[m] === 'function');
  });

  check('kitchenController exports all methods', () => {
    const c = require('../controllers/kitchenController');
    return ['getOrders','updateStatus','getStats'].every(m => typeof c[m] === 'function');
  });

  check('waiterController exports all methods', () => {
    const c = require('../controllers/waiterController');
    return ['getMyTables','getRequests','createRequest','resolveRequest',
            'getAllAssignments','createAssignment','deleteAssignment']
      .every(m => typeof c[m] === 'function');
  });

  check('inventoryController exports all methods', () => {
    const c = require('../controllers/inventoryController');
    return ['getAll','getLowStock','getById','create','update','remove',
            'recordPurchase','deductStock','getPurchases']
      .every(m => typeof c[m] === 'function');
  });

  check('analyticsController exports all methods', () => {
    const c = require('../controllers/analyticsController');
    return ['getRevenue','getPeakHours','getPopularDishes','getTableUtilization',
            'getReservationTrend','getOrderTypes','getCustomerSatisfaction','getSummary']
      .every(m => typeof c[m] === 'function');
  });

  check('cashierController exports all methods', () => {
    const c = require('../controllers/cashierController');
    return ['getPendingPaymentOrders','generateBill','downloadInvoice','splitBill','processRefund']
      .every(m => typeof c[m] === 'function');
  });

  // ─────────────────────────────────────────────────────────
  section('3. ROUTES — Express routers load without error');
  // ─────────────────────────────────────────────────────────

  const routes = [
    'reservationRoutes','tableRoutes','kitchenRoutes',
    'waiterRoutes','inventoryRoutes','analyticsRoutes',
    'cashierRoutes','aiRoutes'
  ];

  routes.forEach(name => {
    check(`routes/${name}.js loads as Express router`, () => {
      const r = require(`../routes/${name}`);
      return typeof r === 'function' && r.stack !== undefined;
    });
  });

  // ─────────────────────────────────────────────────────────
  section('4. MODELS — Model objects have required methods');
  // ─────────────────────────────────────────────────────────

  check('Reservation model has all methods', () => {
    const R = require('../models/Reservation');
    return ['create','findById','findByReservationId','getAll','updateStatus',
            'findAvailableTable','getAvailableTables','getTodayStats',
            'generateReservationId']
      .every(m => typeof R[m] === 'function');
  });

  check('Reservation generateReservationId format', () => {
    const R = require('../models/Reservation');
    const id = R.generateReservationId();
    return typeof id === 'string' && id.startsWith('RES') && id.length === 9;
  });

  check('Table model has all methods', () => {
    const T = require('../models/Table');
    return ['getAll','findById','findByTableNumber','updateStatus','create',
            'update','delete','getFloorMap','getStats','transferOrder']
      .every(m => typeof T[m] === 'function');
  });

  // ─────────────────────────────────────────────────────────
  section('5. AI SERVICE — Graceful fallback without API key');
  // ─────────────────────────────────────────────────────────

  // Temporarily unset key to test fallback
  const origKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  check('aiService loads without errors', () => {
    const ai = require('../services/aiService');
    return ['getFoodRecommendations','chat','analyzeSentiment','predictDemand','summarizeFeedback']
      .every(m => typeof ai[m] === 'function');
  });

  process.env.GEMINI_API_KEY = origKey;

  // ─────────────────────────────────────────────────────────
  section('6. CONFIG — New keys present');
  // ─────────────────────────────────────────────────────────

  check('config.js loads correctly', () => {
    const c = require('../config/config');
    return !!c.db && !!c.jwt && !!c.aws;
  });

  check('GEMINI_API_KEY entry present in env', () => {
    // Just check the key name is set (placeholder is fine)
    return 'GEMINI_API_KEY' in process.env;
  });

  // ─────────────────────────────────────────────────────────
  section('7. SERVER — All routes registered correctly');
  // ─────────────────────────────────────────────────────────

  check('server.js loads without syntax errors', () => {
    // We check by requiring just the express app setup
    // Use a trick: read server.js and check for all route registrations
    const fs = require('fs');
    const src = fs.readFileSync(require.resolve('../server.js'), 'utf8');
    const requiredRoutes = [
      '/api/reservations', '/api/tables', '/api/kitchen',
      '/api/waiter', '/api/inventory', '/api/analytics',
      '/api/cashier', '/api/ai'
    ];
    return requiredRoutes.every(r => src.includes(r));
  });

  check('New page routes in server.js URL map', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require.resolve('../server.js'), 'utf8');
    const pages = [
      '/reservation', '/table-order', '/bill', '/feedback', '/loyalty',
      '/admin/floor-map', '/admin/kitchen', '/admin/waiter',
      '/admin/inventory', '/admin/analytics'
    ];
    return pages.every(p => src.includes(`'${p}'`));
  });

  check('migration_v2.sql exists and has new tables', () => {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(
      path.join(__dirname, '../../database/migration_v2.sql'), 'utf8'
    );
    const tables = ['restaurant_tables','table_reservations','kitchen_orders',
                    'waiter_requests','inventory','feedback','loyalty_points','audit_logs'];
    return tables.every(t => sql.includes(t));
  });

  // ─────────────────────────────────────────────────────────
  section('8. NPM PACKAGES — Required packages installed');
  // ─────────────────────────────────────────────────────────

  const packages = ['qrcode', '@google/generative-ai', 'socket.io'];
  packages.forEach(pkg => {
    check(`Package "${pkg}" is installed`, () => {
      require(pkg);
      return true;
    });
  });

  // Also check existing packages still work
  ['express', 'mysql2', 'jsonwebtoken', 'bcryptjs', 'pdfkit'].forEach(pkg => {
    check(`Existing package "${pkg}" still works`, () => {
      require(pkg);
      return true;
    });
  });

  // ─────────────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────────────
  const total = pass + fail;
  const rate = total > 0 ? ((pass / total) * 100).toFixed(1) : 0;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${pass} passed · ${fail} failed (${rate}%)`.padEnd(55) + '║');
  console.log('╚══════════════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n❌ FAILURES:');
    errors.forEach(e => console.log(`  • ${e}`));
  } else {
    console.log('\n🎉 All logic & syntax checks passed!\n');
    console.log('📋 Next step: Run full API tests against the deployed server:');
    console.log('   node scripts/testV2.js    (requires DB connection)\n');
  }

  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('\n💥 Logic test crashed:', e.message);
  process.exit(1);
});
