/**
 * Seed all staff users with bcrypt-hashed passwords
 * Run: node scripts/seedAdmin.js
 *
 * Roles seeded:
 *   admin    — admin@restaurant.com    / Admin@123
 *   manager  — manager@restaurant.com  / Manager@123
 *   chef     — chef@restaurant.com     / Chef@123
 *   waiter   — waiter@restaurant.com   / Waiter@123
 *   cashier  — cashier@restaurant.com  / Cashier@123
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('../config/config');

const STAFF = [
  { name: 'Admin User',    email: 'admin@restaurant.com',   phone: '9000000001', password: 'Admin@123',   role: 'admin'   },
  { name: 'Restaurant Manager', email: 'manager@restaurant.com', phone: '9000000002', password: 'Manager@123', role: 'manager' },
  { name: 'Head Chef',     email: 'chef@restaurant.com',    phone: '9000000003', password: 'Chef@123',    role: 'chef'    },
  { name: 'Waiter Staff',  email: 'waiter@restaurant.com',  phone: '9000000004', password: 'Waiter@123',  role: 'waiter'  },
  { name: 'Cashier Staff', email: 'cashier@restaurant.com', phone: '9000000005', password: 'Cashier@123', role: 'cashier' },
];

async function seedAllStaff() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port
  });

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     FoodHub — Staff Account Seeder       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  for (const staff of STAFF) {
    const hashedPassword = await bcrypt.hash(staff.password, 10);
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [staff.email]);

    if (existing.length > 0) {
      await connection.execute(
        'UPDATE users SET password = ?, role = ?, name = ? WHERE email = ?',
        [hashedPassword, staff.role, staff.name, staff.email]
      );
      console.log(`  ✅ Updated : ${staff.role.padEnd(8)} | ${staff.email} | ${staff.password}`);
    } else {
      await connection.execute(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [staff.name, staff.email, staff.phone, hashedPassword, staff.role]
      );
      // If admin, also insert into admin table
      if (staff.role === 'admin') {
        const [inserted] = await connection.execute('SELECT id FROM users WHERE email = ?', [staff.email]);
        if (inserted.length > 0) {
          await connection.execute(
            'INSERT IGNORE INTO admin (user_id, department) VALUES (?, ?)',
            [inserted[0].id, 'management']
          );
        }
      }
      console.log(`  ✅ Created : ${staff.role.padEnd(8)} | ${staff.email} | ${staff.password}`);
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  All staff accounts ready!');
  console.log('══════════════════════════════════════════\n');

  await connection.end();
}

seedAllStaff().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
