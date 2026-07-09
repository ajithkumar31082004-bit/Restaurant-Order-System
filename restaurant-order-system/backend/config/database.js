const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool(config.db);

pool.getConnection()
  .then((conn) => {
    console.log('MySQL connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('MySQL connection failed:', err.message);
  });

module.exports = pool;
