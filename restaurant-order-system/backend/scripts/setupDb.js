/**
 * Database Setup Script — FoodHub
 * Reads database/mysql.sql and imports schema directly into MySQL using mysql2
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setup() {
  console.log('Connecting to MySQL host:', process.env.DB_HOST || 'localhost');
  
  // Connect without database to create it if not exists
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    multipleStatements: true // critical to run multiple statements at once
  });

  try {
    console.log('Creating database if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS `restaurant_db`');
    console.log('Database restaurant_db created/verified.');

    await connection.query('USE `restaurant_db`');

    const sqlPath = path.join(__dirname, '../../database/mysql.sql');
    console.log('Reading schema from:', sqlPath);
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Remove comments
    sql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('#'))
      .join('\n');

    console.log('Executing schema import...');
    await connection.query(sql);
    console.log('Database import completed successfully!');

    // Let's seed the admin user as well if needed
    console.log('Database setup and migration successfully finished.');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setup();
