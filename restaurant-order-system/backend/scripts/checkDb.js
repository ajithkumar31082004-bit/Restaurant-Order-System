const pool = require('../config/database');

async function checkDb() {
  try {
    // Check all users
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY id'
    );

    console.log('\n========================================');
    console.log('         DATABASE STATUS REPORT         ');
    console.log('========================================\n');

    // Summary
    const admins = users.filter(u => u.role === 'admin');
    const customers = users.filter(u => u.role === 'user');

    console.log(`Total Users  : ${users.length}`);
    console.log(`  ✅ Admins   : ${admins.length}`);
    console.log(`  👤 Customers: ${customers.length}\n`);

    if (admins.length > 0) {
      console.log('── ADMIN ACCOUNTS ──────────────────────');
      admins.forEach(u => {
        console.log(`  ID       : ${u.id}`);
        console.log(`  Name     : ${u.name}`);
        console.log(`  Email    : ${u.email}`);
        console.log(`  Phone    : ${u.phone}`);
        console.log(`  Active   : ${u.is_active ? 'YES ✅' : 'NO ❌'}`);
        console.log(`  Created  : ${new Date(u.created_at).toLocaleString('en-IN')}`);
        console.log('');
      });
    } else {
      console.log('❌ NO ADMIN FOUND IN DATABASE!');
      console.log('   Run: node scripts/seedAdmin.js\n');
    }

    if (customers.length > 0) {
      console.log('── CUSTOMER ACCOUNTS ───────────────────');
      customers.forEach(u => {
        console.log(`  ID: ${u.id} | ${u.name} | ${u.email} | Active: ${u.is_active ? 'YES' : 'NO'}`);
      });
      console.log('');
    }

    // Check tables exist
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('── DATABASE TABLES ─────────────────────');
    tables.forEach(t => console.log(`  ✅ ${Object.values(t)[0]}`));

    // Check food count
    const [foods] = await pool.execute('SELECT COUNT(*) as cnt FROM foods');
    const [orders] = await pool.execute('SELECT COUNT(*) as cnt FROM orders');
    const [categories] = await pool.execute('SELECT COUNT(*) as cnt FROM categories');

    console.log('\n── RECORD COUNTS ───────────────────────');
    console.log(`  Foods      : ${foods[0].cnt}`);
    console.log(`  Categories : ${categories[0].cnt}`);
    console.log(`  Orders     : ${orders[0].cnt}`);
    console.log(`  Users      : ${users.length}`);
    console.log('\n========================================\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDb();
