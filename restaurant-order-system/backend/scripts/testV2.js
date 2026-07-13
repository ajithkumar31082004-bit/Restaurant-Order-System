/**
 * FoodHub v2.0 — Complete API Test Suite
 * Tests all new v2 endpoints: reservations, tables, kitchen, waiter,
 * inventory, analytics, cashier, and AI routes.
 * Run: node scripts/testV2.js   (server must be running on port 5000)
 */
const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 5000;

let adminToken = '';
let createdOrderId = '';
let createdReservationId = '';
let createdTableId = '';
let createdKitchenOrderId = '';
let createdInventoryId = '';

let pass = 0, fail = 0, skip = 0;
const errors = [];
const warnings = [];

// ── HTTP helper ─────────────────────────────────────────────────────────────
function req(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    r.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

// ── Assertion helpers ────────────────────────────────────────────────────────
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    pass++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    fail++;
    errors.push(`${name}${detail ? ': ' + detail : ''}`);
  }
}

function warn(name, detail) {
  console.log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
  warnings.push(name);
  skip++;
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ── Test Runner ──────────────────────────────────────────────────────────────
async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     FoodHub v2.0 — Complete API Test Suite          ║');
  console.log('║  Reservations · Tables · Kitchen · Waiter · AI      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ────────────────────────────────────────────────────────
  section('0. PRE-FLIGHT — Server Health & Login');
  // ────────────────────────────────────────────────────────

  let r = await req('GET', '/api');
  check('Server is running (GET /api)', r.status === 200, `status=${r.status}, err=${r.error || ''}`);
  if (r.status === 0) {
    console.log('\n⛔  Server is not running. Start it with: npm run dev\n');
    process.exit(1);
  }
  check('API version is 2.0.0', r.body?.version === '2.0.0', `got: ${r.body?.version}`);
  check('All new endpoints listed', ['reservations','tables','kitchen','waiter','inventory','analytics','cashier','ai']
    .every(k => !!r.body?.endpoints?.[k]), JSON.stringify(r.body?.endpoints));

  // Admin login
  r = await req('POST', '/api/auth/login', { email: 'admin@restaurant.com', password: 'Admin@123' });
  check('Admin login succeeds', r.status === 200, `status=${r.status}`);
  if (r.body?.data?.token) adminToken = r.body.data.token;
  check('Admin token obtained', !!adminToken);

  // ────────────────────────────────────────────────────────
  section('1. TABLES — Floor Map & CRUD');
  // ────────────────────────────────────────────────────────

  r = await req('GET', '/api/tables');
  check('GET /api/tables returns 200', r.status === 200, `status=${r.status}, err=${JSON.stringify(r.body)}`);
  check('Tables array returned', Array.isArray(r.body?.data), `data=${JSON.stringify(r.body?.data)}`);
  check('Has 20 seeded tables', (r.body?.data?.length || 0) >= 20, `count=${r.body?.data?.length}`);

  // Floor map
  r = await req('GET', '/api/tables/floor-map');
  check('GET /api/tables/floor-map returns 200', r.status === 200, `status=${r.status}`);
  check('Floor map has floors object', !!r.body?.data?.floors, JSON.stringify(r.body?.data));
  check('Floor map has stats', !!r.body?.data?.stats);
  check('Ground floor tables exist', Array.isArray(r.body?.data?.floors?.ground), JSON.stringify(Object.keys(r.body?.data?.floors || {})));

  // Stats
  r = await req('GET', '/api/tables/stats');
  check('GET /api/tables/stats returns 200', r.status === 200);
  check('Stats has total count', typeof r.body?.data?.total === 'number', JSON.stringify(r.body?.data));

  // Get table by ID
  r = await req('GET', '/api/tables/1');
  check('GET /api/tables/1 returns table', r.status === 200 && !!r.body?.data?.table_number, `data=${JSON.stringify(r.body?.data)}`);
  if (r.body?.data) createdTableId = r.body.data.id;

  // QR code generation
  r = await req('GET', '/api/tables/1/qr');
  check('GET /api/tables/1/qr returns QR data URL', r.status === 200 && r.body?.data?.qr_data_url?.startsWith('data:image/png'), `got: ${r.body?.data?.qr_data_url?.slice(0,30)}`);
  check('QR has scan_url', !!r.body?.data?.scan_url, r.body?.data?.scan_url);

  // Create table (admin)
  r = await req('POST', '/api/tables',
    { table_number: 'T-TEST', floor: 'ground', table_type: 'indoor', capacity: 4 },
    adminToken
  );
  check('POST /api/tables creates new table', r.status === 201, `status=${r.status}, msg=${r.body?.message}`);
  const testTableId = r.body?.data?.id;

  // Update status
  if (testTableId) {
    r = await req('PUT', `/api/tables/${testTableId}/status`, { status: 'cleaning' }, adminToken);
    check('PUT /api/tables/:id/status updates to cleaning', r.status === 200 && r.body?.data?.status === 'cleaning', `status=${r.status}, data=${JSON.stringify(r.body?.data)}`);

    r = await req('PUT', `/api/tables/${testTableId}/status`, { status: 'available' }, adminToken);
    check('PUT /api/tables/:id/status reset to available', r.status === 200);

    // Invalid status
    r = await req('PUT', `/api/tables/${testTableId}/status`, { status: 'flying' }, adminToken);
    check('Invalid table status returns 400', r.status === 400, `status=${r.status}`);

    // Delete test table
    r = await req('DELETE', `/api/tables/${testTableId}`, null, adminToken);
    check('DELETE /api/tables/:id deletes table', r.status === 200, `status=${r.status}`);
  }

  // Unauthorized status update
  r = await req('PUT', '/api/tables/1/status', { status: 'cleaning' });
  check('Status update without auth returns 401', r.status === 401, `status=${r.status}`);

  // ────────────────────────────────────────────────────────
  section('2. RESERVATIONS — Full Booking Flow');
  // ────────────────────────────────────────────────────────

  // Available tables query
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  r = await req('GET', `/api/reservations/available-tables?date=${dateStr}&time=19:00:00&guests=2`);
  check('GET available-tables returns 200', r.status === 200, `status=${r.status}, err=${JSON.stringify(r.body)}`);
  check('Available tables is array', Array.isArray(r.body?.data));

  // Missing params
  r = await req('GET', '/api/reservations/available-tables');
  check('available-tables missing params returns 400', r.status === 400);

  // Create reservation
  r = await req('POST', '/api/reservations', {
    customer_name: 'Ajith Kumar',
    customer_phone: '9876543210',
    customer_email: 'ajith@test.com',
    reservation_date: dateStr,
    reservation_time: '20:00:00',
    guest_count: 4,
    table_preference: 'indoor',
    special_event: 'birthday',
    special_requests: 'Bring a birthday cake'
  });
  check('POST /api/reservations creates reservation', r.status === 201, `status=${r.status}, msg=${r.body?.message}, err=${JSON.stringify(r.body)}`);
  check('Returns reservation_id (RES...)', r.body?.data?.reservation_id?.startsWith('RES'), `got: ${r.body?.data?.reservation_id}`);
  if (r.body?.data?.reservation_id) createdReservationId = r.body.data.reservation_id;

  // Missing fields
  r = await req('POST', '/api/reservations', { customer_name: 'Only Name' });
  check('POST reservation missing fields returns 400', r.status === 400, `status=${r.status}`);

  // Get by reservation ID
  if (createdReservationId) {
    r = await req('GET', `/api/reservations/${createdReservationId}`);
    check(`GET /api/reservations/${createdReservationId} returns data`, r.status === 200 && r.body?.data?.reservation_id === createdReservationId, `status=${r.status}`);

    // Update status
    r = await req('PUT', `/api/reservations/${r.body?.data?.id}/status`, { status: 'confirmed' }, adminToken);
    check('PUT reservation status → confirmed', r.status === 200 && r.body?.data?.status === 'confirmed', `status=${r.status}, got=${r.body?.data?.status}`);

    r = await req('PUT', `/api/reservations/${r.body?.data?.id}/status`, { status: 'cancelled' }, adminToken);
    check('PUT reservation status → cancelled', r.status === 200, `status=${r.status}`);
  }

  // GET all (admin)
  r = await req('GET', '/api/reservations', null, adminToken);
  check('GET /api/reservations (admin) returns list', r.status === 200 && Array.isArray(r.body?.data), `status=${r.status}`);

  // Reservation stats
  r = await req('GET', '/api/reservations/stats', null, adminToken);
  check('GET /api/reservations/stats returns data', r.status === 200 && r.body?.data !== undefined, `status=${r.status}`);

  // ────────────────────────────────────────────────────────
  section('3. KITCHEN — Display System');
  // ────────────────────────────────────────────────────────

  // Need auth
  r = await req('GET', '/api/kitchen/orders');
  check('GET /api/kitchen/orders without auth returns 401', r.status === 401);

  r = await req('GET', '/api/kitchen/orders', null, adminToken);
  check('GET /api/kitchen/orders (admin) returns 200', r.status === 200, `status=${r.status}, err=${JSON.stringify(r.body)}`);
  check('Kitchen orders is array', Array.isArray(r.body?.data));

  r = await req('GET', '/api/kitchen/stats', null, adminToken);
  check('GET /api/kitchen/stats returns 200', r.status === 200, `status=${r.status}`);
  check('Stats has today total', typeof r.body?.data?.total_today === 'number', JSON.stringify(r.body?.data));
  check('Stats has avg_prep_minutes', 'avg_prep_minutes' in (r.body?.data || {}), JSON.stringify(r.body?.data));

  // If any kitchen orders exist, test status update
  r = await req('GET', '/api/kitchen/orders', null, adminToken);
  if (r.body?.data?.length > 0) {
    createdKitchenOrderId = r.body.data[0].id;
    r = await req('PUT', `/api/kitchen/orders/${createdKitchenOrderId}/status`, { status: 'accepted' }, adminToken);
    check('PUT kitchen order status → accepted', r.status === 200, `status=${r.status}`);
  } else {
    warn('Kitchen status update', 'No kitchen orders exist yet (place a dine-in order first)');
  }

  // Invalid status
  r = await req('PUT', '/api/kitchen/orders/1/status', { status: 'flying' }, adminToken);
  check('Invalid kitchen status returns 400', r.status === 400, `status=${r.status}`);

  // ────────────────────────────────────────────────────────
  section('4. WAITER — Requests & Assignments');
  // ────────────────────────────────────────────────────────

  // Create customer request (public — no auth)
  r = await req('POST', '/api/waiter/request', {
    table_id: 1,
    request_type: 'water',
    message: 'Please bring some water'
  });
  check('POST /api/waiter/request (no auth) returns 201', r.status === 201, `status=${r.status}, err=${JSON.stringify(r.body)}`);
  check('Request has id', !!r.body?.data?.id, JSON.stringify(r.body?.data));
  const waiterRequestId = r.body?.data?.id;

  // Missing fields
  r = await req('POST', '/api/waiter/request', { message: 'no table' });
  check('Waiter request missing table_id returns 400', r.status === 400);

  // Get requests (admin)
  r = await req('GET', '/api/waiter/requests', null, adminToken);
  check('GET /api/waiter/requests (admin) returns 200', r.status === 200, `status=${r.status}`);
  check('Requests is array', Array.isArray(r.body?.data));

  // Resolve request (admin)
  if (waiterRequestId) {
    r = await req('PUT', `/api/waiter/requests/${waiterRequestId}/resolve`, null, adminToken);
    check(`PUT /api/waiter/requests/${waiterRequestId}/resolve`, r.status === 200, `status=${r.status}`);
  }

  // Assignments
  r = await req('GET', '/api/waiter/assignments', null, adminToken);
  check('GET /api/waiter/assignments (admin) returns 200', r.status === 200, `status=${r.status}`);

  // My tables — needs waiter role, admin token should be rejected by roleMiddleware
  r = await req('GET', '/api/waiter/tables', null, adminToken);
  // Admin has 'admin' role which is in ['admin','manager','waiter'] so it should pass
  check('GET /api/waiter/tables (admin) returns 200', r.status === 200, `status=${r.status}`);

  // Without auth
  r = await req('GET', '/api/waiter/requests');
  check('GET /api/waiter/requests without auth returns 401', r.status === 401);

  // ────────────────────────────────────────────────────────
  section('5. INVENTORY — Stock Management');
  // ────────────────────────────────────────────────────────

  r = await req('GET', '/api/inventory', null, adminToken);
  check('GET /api/inventory returns 200', r.status === 200, `status=${r.status}`);
  check('Inventory is array', Array.isArray(r.body?.data));
  check('Has seeded items (>=10)', (r.body?.data?.length || 0) >= 10, `count=${r.body?.data?.length}`);

  r = await req('GET', '/api/inventory/low-stock', null, adminToken);
  check('GET /api/inventory/low-stock returns 200', r.status === 200, `status=${r.status}`);
  check('Low stock is array', Array.isArray(r.body?.data));

  // Create item
  r = await req('POST', '/api/inventory', {
    item_name: 'Test Ingredient',
    category: 'other',
    quantity: 5,
    unit: 'kg',
    low_stock_threshold: 2,
    cost_per_unit: 100
  }, adminToken);
  check('POST /api/inventory creates item', r.status === 201, `status=${r.status}, msg=${r.body?.message}`);
  createdInventoryId = r.body?.data?.id;

  // Missing fields
  r = await req('POST', '/api/inventory', { item_name: 'incomplete' }, adminToken);
  check('POST inventory missing fields returns 400', r.status === 400);

  // Get by ID
  if (createdInventoryId) {
    r = await req('GET', `/api/inventory/${createdInventoryId}`, null, adminToken);
    check('GET /api/inventory/:id returns item', r.status === 200 && r.body?.data?.id === createdInventoryId, `status=${r.status}`);

    // Update
    r = await req('PUT', `/api/inventory/${createdInventoryId}`, { quantity: 10 }, adminToken);
    check('PUT /api/inventory/:id updates quantity', r.status === 200 && r.body?.data?.quantity == 10, `status=${r.status}, qty=${r.body?.data?.quantity}`);

    // Record purchase
    r = await req('POST', '/api/inventory/purchases', {
      inventory_id: createdInventoryId,
      supplier_name: 'Test Supplier',
      quantity: 5,
      unit_cost: 100,
      invoice_number: 'INV-001'
    }, adminToken);
    check('POST /api/inventory/purchases records purchase', r.status === 201, `status=${r.status}, msg=${r.body?.message}`);

    // Deduct stock
    r = await req('POST', '/api/inventory/deduct', {
      deductions: [{ inventory_id: createdInventoryId, quantity: 1 }]
    }, adminToken);
    check('POST /api/inventory/deduct deducts stock', r.status === 200, `status=${r.status}`);

    // Delete
    r = await req('DELETE', `/api/inventory/${createdInventoryId}`, null, adminToken);
    check('DELETE /api/inventory/:id removes item', r.status === 200, `status=${r.status}`);
  }

  // Without auth
  r = await req('GET', '/api/inventory');
  check('GET /api/inventory without auth returns 401', r.status === 401);

  // ────────────────────────────────────────────────────────
  section('6. ANALYTICS — Business Intelligence');
  // ────────────────────────────────────────────────────────

  r = await req('GET', '/api/analytics/summary', null, adminToken);
  check('GET /api/analytics/summary returns 200', r.status === 200, `status=${r.status}`);
  check('Summary has today_orders', 'today_orders' in (r.body?.data || {}), JSON.stringify(r.body?.data));
  check('Summary has today_revenue', 'today_revenue' in (r.body?.data || {}));
  check('Summary has occupied_tables', 'occupied_tables' in (r.body?.data || {}));
  check('Summary has kitchen_queue', 'kitchen_queue' in (r.body?.data || {}));

  r = await req('GET', '/api/analytics/revenue?period=daily', null, adminToken);
  check('GET /api/analytics/revenue (daily) returns 200', r.status === 200, `status=${r.status}`);
  check('Revenue data is array', Array.isArray(r.body?.data));

  r = await req('GET', '/api/analytics/revenue?period=monthly', null, adminToken);
  check('GET /api/analytics/revenue (monthly) returns 200', r.status === 200);

  r = await req('GET', '/api/analytics/peak-hours', null, adminToken);
  check('GET /api/analytics/peak-hours returns 200', r.status === 200, `status=${r.status}`);
  check('Peak hours is array', Array.isArray(r.body?.data));

  r = await req('GET', '/api/analytics/popular-dishes', null, adminToken);
  check('GET /api/analytics/popular-dishes returns 200', r.status === 200, `status=${r.status}`);
  check('Popular dishes is array', Array.isArray(r.body?.data));

  r = await req('GET', '/api/analytics/table-utilization', null, adminToken);
  check('GET /api/analytics/table-utilization returns 200', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/api/analytics/reservation-trend', null, adminToken);
  check('GET /api/analytics/reservation-trend returns 200', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/api/analytics/order-types', null, adminToken);
  check('GET /api/analytics/order-types returns 200', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/api/analytics/customer-satisfaction', null, adminToken);
  check('GET /api/analytics/customer-satisfaction returns 200', r.status === 200, `status=${r.status}`);

  // Without auth
  r = await req('GET', '/api/analytics/summary');
  check('Analytics without auth returns 401', r.status === 401);

  // ────────────────────────────────────────────────────────
  section('7. CASHIER — Billing & Payments');
  // ────────────────────────────────────────────────────────

  r = await req('GET', '/api/cashier/orders', null, adminToken);
  check('GET /api/cashier/orders returns 200', r.status === 200, `status=${r.status}`);
  check('Pending payment orders is array', Array.isArray(r.body?.data));

  // Create a test order to bill
  r = await req('POST', '/api/orders', {
    name: 'Bill Test Customer',
    phone: '9999999999',
    address: '1 Test St',
    city: 'Chennai',
    pincode: '600001',
    items: [{ id: 1, name: 'Butter Chicken', price: 299, qty: 1 }],
    payment: 'UPI'
  });
  if (r.body?.data?.orderId) {
    const testOrderId = r.body.data.orderId;

    r = await req('GET', `/api/cashier/invoice/${testOrderId}`);
    check('GET /api/cashier/invoice/:id returns bill data', r.status === 200, `status=${r.status}`);
    check('Bill has subtotal', typeof r.body?.data?.bill?.subtotal === 'number', JSON.stringify(r.body?.data?.bill));
    check('Bill has service_charge', typeof r.body?.data?.bill?.service_charge === 'number');
    check('Bill has grand_total', typeof r.body?.data?.bill?.grand_total === 'number');

    r = await req('GET', `/api/cashier/invoice/${testOrderId}/pdf`);
    check('GET /api/cashier/invoice/:id/pdf returns PDF', r.status === 200, `status=${r.status}, type=${typeof r.body}`);
  } else {
    warn('Cashier billing test', 'Could not create test order for billing');
  }

  // Split bill
  r = await req('POST', '/api/cashier/split-bill', null, adminToken);
  check('POST /api/cashier/split-bill missing body returns 400', r.status === 400, `status=${r.status}`);

  // Cashier without auth
  r = await req('GET', '/api/cashier/orders');
  check('GET /api/cashier/orders without auth returns 401', r.status === 401);

  // ────────────────────────────────────────────────────────
  section('8. AI — Gemini Integration');
  // ────────────────────────────────────────────────────────

  // Chat (public endpoint, graceful degradation if no API key)
  r = await req('POST', '/api/ai/chat', {
    message: 'What vegetarian dishes do you have under ₹200?',
    table: 'T-01'
  });
  check('POST /api/ai/chat returns 200', r.status === 200, `status=${r.status}, err=${JSON.stringify(r.body)}`);
  check('Chat has reply field', typeof r.body?.data?.reply === 'string', JSON.stringify(r.body?.data));

  // Missing message
  r = await req('POST', '/api/ai/chat', {});
  check('POST /api/ai/chat missing message returns 400', r.status === 400);

  // Recommendations
  r = await req('GET', '/api/ai/recommendations/1');
  check('GET /api/ai/recommendations/:userId returns 200', r.status === 200, `status=${r.status}`);
  check('Recommendations is array', Array.isArray(r.body?.data));

  // Feedback submit (no auth needed)
  r = await req('POST', '/api/ai/feedback', {
    customer_name: 'Test Customer',
    food_rating: 5,
    service_rating: 4,
    ambience_rating: 5,
    overall_rating: 5,
    comment: 'Amazing food and service! The biryani was perfect.'
  });
  check('POST /api/ai/feedback submits feedback', r.status === 201, `status=${r.status}, msg=${r.body?.message}`);

  // Sentiment analysis (requires auth)
  r = await req('POST', '/api/ai/sentiment', { text: 'Food was great but service was slow' }, adminToken);
  check('POST /api/ai/sentiment returns 200', r.status === 200, `status=${r.status}`);
  check('Sentiment has sentiment field', ['positive','neutral','negative'].includes(r.body?.data?.sentiment), `got: ${r.body?.data?.sentiment}`);

  // Demand prediction (admin only)
  r = await req('GET', '/api/ai/demand-prediction', null, adminToken);
  check('GET /api/ai/demand-prediction returns 200', r.status === 200, `status=${r.status}`);
  check('Demand prediction has peak_hours', Array.isArray(r.body?.data?.peak_hours), JSON.stringify(r.body?.data));

  // Feedback summary (admin only)
  r = await req('GET', '/api/ai/feedback-summary', null, adminToken);
  check('GET /api/ai/feedback-summary returns 200', r.status === 200, `status=${r.status}`);
  check('Feedback summary has summary field', typeof r.body?.data?.summary === 'string', JSON.stringify(r.body?.data));

  // AI endpoints (get feedback list)
  r = await req('GET', '/api/ai/feedback', null, adminToken);
  check('GET /api/ai/feedback (admin) returns 200', r.status === 200, `status=${r.status}`);
  check('Feedback list is array', Array.isArray(r.body?.data));

  // Without auth
  r = await req('GET', '/api/ai/demand-prediction');
  check('Demand prediction without auth returns 401', r.status === 401);

  // ────────────────────────────────────────────────────────
  section('9. EXISTING ENDPOINTS — Regression Check');
  // ────────────────────────────────────────────────────────

  r = await req('GET', '/api/categories');
  check('GET /api/categories still works', r.status === 200 && Array.isArray(r.body?.data));

  r = await req('GET', '/api/foods');
  check('GET /api/foods still works', r.status === 200 && Array.isArray(r.body?.data));

  r = await req('GET', '/api/admin/dashboard', null, adminToken);
  check('GET /api/admin/dashboard still works', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/api/admin/users', null, adminToken);
  check('GET /api/admin/users still works', r.status === 200, `status=${r.status}`);

  // ────────────────────────────────────────────────────────
  section('10. ROLE-BASED ACCESS CONTROL');
  // ────────────────────────────────────────────────────────

  // Customer registers and tries to access admin routes
  const testEmail = `testcustomer_${Date.now()}@example.com`;
  r = await req('POST', '/api/auth/register', {
    name: 'Test Customer',
    email: testEmail,
    phone: '9000000001',
    password: 'Test@1234'
  });
  let customerToken = '';
  if (r.status === 201 || r.status === 200) {
    r = await req('POST', '/api/auth/login', { email: testEmail, password: 'Test@1234' });
    customerToken = r.body?.data?.token || '';
  }

  if (customerToken) {
    r = await req('GET', '/api/inventory', null, customerToken);
    check('Customer cannot access inventory (403)', r.status === 403, `status=${r.status}`);

    r = await req('GET', '/api/analytics/summary', null, customerToken);
    check('Customer cannot access analytics (403)', r.status === 403, `status=${r.status}`);

    r = await req('GET', '/api/kitchen/orders', null, customerToken);
    check('Customer cannot access kitchen orders (403)', r.status === 403, `status=${r.status}`);

    r = await req('GET', '/api/cashier/orders', null, customerToken);
    check('Customer cannot access cashier orders (403)', r.status === 403, `status=${r.status}`);

    r = await req('GET', '/api/waiter/tables', null, customerToken);
    check('Customer cannot access waiter tables (403)', r.status === 403, `status=${r.status}`);
  } else {
    warn('RBAC customer tests', 'Could not register/login test customer');
  }

  // ────────────────────────────────────────────────────────
  // FINAL REPORT
  // ────────────────────────────────────────────────────────
  const total = pass + fail;
  const passRate = total > 0 ? ((pass / total) * 100).toFixed(1) : 0;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${pass} passed · ${fail} failed · ${skip} skipped          `.padEnd(55) + '║');
  console.log(`║  Pass Rate: ${passRate}%`.padEnd(55) + '║');
  console.log('╚══════════════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n❌ FAILURES:');
    errors.forEach((e) => console.log(`  • ${e}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (skipped, need data):');
    warnings.forEach((w) => console.log(`  • ${w}`));
  }

  if (fail === 0) {
    console.log('\n🎉 All tests passed! v2.0 API is fully operational.\n');
  } else {
    console.log(`\n⚠️  ${fail} test(s) failed. Check errors above.\n`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('\n💥 Test runner crashed:', e.message);
  console.error(e.stack);
  process.exit(1);
});
