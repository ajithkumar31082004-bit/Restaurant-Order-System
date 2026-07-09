/**
 * Daily Backup Script — FoodHub Database
 * Executed via node scripts/backup.js
 */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${config.db.database}-${timestamp}.sql`);

console.log(`Starting database backup for: ${config.db.database}...`);

// Mysqldump command string builder
const host = config.db.host;
const user = config.db.user;
const password = config.db.password;
const dbName = config.db.database;

// Note: Requires mysqldump installed on path
let cmd = `mysqldump -h ${host} -u ${user}`;
if (password) {
  cmd += ` -p${password}`;
}
cmd += ` ${dbName} > "${backupFile}"`;

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup execution failed: ${error.message}`);
    // Create a fallback JSON backup in case mysqldump is not installed
    fallbackBackup();
    return;
  }
  if (stderr && !stderr.includes('Warning')) {
    console.warn(`Backup process warning/info: ${stderr}`);
  }
  console.log(`Backup completed successfully! Saved to: ${backupFile}`);
});

// Fallback Javascript database JSON dumper
async function fallbackBackup() {
  const fallbackFile = path.join(backupDir, `backup-fallback-${config.db.database}-${timestamp}.json`);
  console.log(`Attempting fallback JSON database dump to: ${fallbackFile}...`);
  try {
    const pool = require('../config/database');
    const tables = ['users', 'admin', 'categories', 'foods', 'cart', 'coupons', 'orders', 'order_items', 'payments', 'favorites', 'reviews', 'addresses', 'notifications', 'offers', 'newsletter'];
    
    const dump = {};
    for (const table of tables) {
      try {
        const [rows] = await pool.execute(`SELECT * FROM ${table}`);
        dump[table] = rows;
      } catch (err) {
        console.warn(`Could not dump table ${table}: ${err.message}`);
      }
    }

    fs.writeFileSync(fallbackFile, JSON.stringify(dump, null, 2));
    console.log(`Fallback JSON backup completed successfully!`);
    process.exit(0);
  } catch (err) {
    console.error(`Fallback backup failed completely: ${err.message}`);
    process.exit(1);
  }
}
