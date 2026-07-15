/**
 * Full API Test Suite — FoodHub Restaurant Order System
 * Tests every endpoint: auth, foods, categories, orders, coupons, admin
 */
const http = require('http');

const BASE = 'http://localhost:5000';
let adminToken = '';
let createdOrderId = '';
let pass = 0, fail = 0;
const errors = [];

function req(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', e => resolve({ status: 0, error: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    pass++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    fail++;
    errors.push(`${name}: ${detail}`);
  }
}

async function run() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      FoodHub — Full API Test Suite       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── 1. Health / Root ─────────────────────────────────
  console.log('── 1. SERVER HEALTH ─────────────────────');
  let r = await req('GET', '/api');
  check('API root responds', r.status === 200);
  check('API version present', r.body?.version === '2.0.0', JSON.stringify(r.body));

  // ── 2. Categories ────────────────────────────────────
  console.log('\n── 2. CATEGORIES ────────────────────────');
  r = await req('GET', '/api/categories');
  check('GET /api/categories returns 200', r.status === 200);
  check('Categories array exists', Array.isArray(r.body?.data));
  check('Has at least 1 category', (r.body?.data?.length ?? 0) > 0, `count=${r.body?.data?.length}`);

  // ── 3. Foods ─────────────────────────────────────────
  console.log('\n── 3. FOODS ─────────────────────────────');
  r = await req('GET', '/api/foods');
  check('GET /api/foods returns 200', r.status === 200);
  check('Foods array exists', Array.isArray(r.body?.data));
  check('Has 210 foods', r.body?.data?.length === 210, `count=${r.body?.data?.length}`);

  r = await req('GET', '/api/foods?category=Biryani');
  check('Filter by category works', r.status === 200 && Array.isArray(r.body?.data));

  r = await req('GET', '/api/foods?search=chicken');
  check('Search foods works', r.status === 200 && Array.isArray(r.body?.data));

  r = await req('GET', '/api/foods?veg=true');
  check('Filter veg foods works', r.status === 200 && Array.isArray(r.body?.data));

  r = await req('GET', '/api/foods/1');
  check('GET /api/foods/:id works', r.status === 200 && r.body?.data?.id);

  r = await req('GET', '/api/foods/999999');
  check('GET invalid food returns 404', r.status === 404);

  // ── 4. Auth — Login ──────────────────────────────────
  console.log('\n── 4. AUTH — LOGIN ──────────────────────');
  r = await req('POST', '/api/auth/login', { email: 'admin@restaurant.com', password: 'Admin@123' });
  check('Admin login returns 200', r.status === 200, `status=${r.status}`);
  check('Login returns token', !!r.body?.data?.token, JSON.stringify(r.body));
  check('Login returns user object', !!r.body?.data?.user);
  check('User role is admin', r.body?.data?.user?.role === 'admin');
  check('Password NOT in response', !r.body?.data?.user?.password);
  if (r.body?.data?.token) adminToken = r.body.data.token;

  r = await req('POST', '/api/auth/login', { email: 'wrong@test.com', password: 'wrong' });
  check('Wrong credentials returns 401', r.status === 401);

  r = await req('POST', '/api/auth/login', { email: 'notanemail', password: 'pass' });
  check('Invalid email format returns 400', r.status === 400);

  r = await req('POST', '/api/auth/login', { email: '', password: '' });
  check('Empty fields returns 400', r.status === 400);

  // ── 5. Auth — Profile ────────────────────────────────
  console.log('\n── 5. AUTH — PROFILE ────────────────────');
  r = await req('GET', '/api/auth/profile', null, adminToken);
  check('GET /api/auth/profile with token returns 200', r.status === 200);
  check('Profile returns user data', !!r.body?.data?.email);

  r = await req('GET', '/api/auth/profile');
  check('GET /api/auth/profile without token returns 401', r.status === 401);

  // ── 6. Coupons ───────────────────────────────────────
  console.log('\n── 6. COUPONS ───────────────────────────');
  r = await req('POST', '/api/coupons/validate', { code: 'INVALIDCOUPON', amount: 500 });
  check('Invalid coupon returns error', r.status === 400 || (r.body?.valid === false));

  r = await req('GET', '/api/coupons', null, adminToken);
  check('GET /api/coupons (admin) returns 200', r.status === 200);

  // ── 7. Orders ────────────────────────────────────────
  console.log('\n── 7. ORDERS ────────────────────────────');
  const orderPayload = {
    name: 'Test Customer',
    phone: '9876543210',
    email: 'test@example.com',
    address: '123 Test Street',
    city: 'Chennai',
    pincode: '600001',
    items: [{ id: 1, name: 'Test Food', price: 200, qty: 2 }],
    payment: 'COD'
  };
  r = await req('POST', '/api/orders', orderPayload);
  check('POST /api/orders creates order', r.status === 201, `status=${r.status}, msg=${r.body?.message}`);
  check('Order returns orderId', !!r.body?.data?.orderId);
  if (r.body?.data?.orderId) createdOrderId = r.body.data.orderId;

  if (createdOrderId) {
    r = await req('GET', `/api/orders/track/${createdOrderId}`);
    check('Track order works', r.status === 200, `status=${r.status}`);
    check('Track returns timeline', Array.isArray(r.body?.data?.timeline));
  }

  r = await req('GET', '/api/orders', null, adminToken);
  check('GET /api/orders (admin) returns orders', r.status === 200);

  // ── 8. Admin Endpoints ───────────────────────────────
  console.log('\n── 8. ADMIN ENDPOINTS ───────────────────');
  r = await req('GET', '/api/admin/dashboard', null, adminToken);
  check('GET /api/admin/dashboard returns 200', r.status === 200, `status=${r.status}`);
  check('Dashboard has stats', !!r.body?.data);

  r = await req('GET', '/api/admin/users', null, adminToken);
  check('GET /api/admin/users returns 200', r.status === 200);
  check('Users list is array', Array.isArray(r.body?.data));

  r = await req('GET', '/api/admin/dashboard');
  check('Admin dashboard without token returns 401', r.status === 401);

  // ── 9. Frontend Pages ────────────────────────────────
  console.log('\n── 9. FRONTEND PAGES ────────────────────');
  const pages = ['/', '/menu', '/login', '/register', '/cart', '/checkout', '/track-order', '/contact', '/admin'];
  for (const page of pages) {
    r = await req('GET', page);
    check(`Page ${page} loads (200/302/304)`, [200, 302, 304].includes(r.status), `status=${r.status}`);
  }

  // ── 10. Static Assets ────────────────────────────────
  console.log('\n── 10. STATIC ASSETS ────────────────────');
  const assets = ['/css/style.css', '/js/api.js', '/js/utils.js', '/js/components.js', '/js/cart.js', '/js/admin.js', '/js/theme.js'];
  for (const asset of assets) {
    r = await req('GET', asset);
    check(`Asset ${asset}`, [200, 304].includes(r.status), `status=${r.status}`);
  }

  // ── FINAL REPORT ─────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${pass} passed, ${fail} failed              ║`);
  console.log('╚══════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n❌ FAILURES:');
    errors.forEach(e => console.log(`  • ${e}`));
  } else {
    console.log('\n🎉 All tests passed! Website is fully functional.');
  }

  if (createdOrderId) {
    console.log(`\n📦 Test order created: ${createdOrderId}`);
  }
  console.log('');
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
