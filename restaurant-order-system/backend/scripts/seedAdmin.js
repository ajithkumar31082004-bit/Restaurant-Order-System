/**
 * Seed admin user with bcrypt-hashed password
 * Run: node scripts/seedAdmin.js
 * Default: admin@restaurant.com / Admin@123
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('../config/config');

async function seedAdmin() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port
  });

  const email = 'admin@restaurant.com';
  const password = 'Admin@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);

  if (existing.length > 0) {
    await connection.execute(
      'UPDATE users SET password = ?, role = ? WHERE email = ?',
      [hashedPassword, 'admin', email]
    );
    console.log(`Admin password updated for ${email}`);
  } else {
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      ['Admin User', email, '9876543210', hashedPassword, 'admin']
    );
    await connection.execute(
      'INSERT INTO admin (user_id, department) VALUES (?, ?)',
      [result.insertId, 'management']
    );
    console.log(`Admin user created: ${email}`);
  }

  console.log(`Login credentials: ${email} / ${password}`);
  await connection.end();
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
