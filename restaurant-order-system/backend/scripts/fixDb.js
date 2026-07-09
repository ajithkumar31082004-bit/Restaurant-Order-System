/**
 * fixDb.js - Creates missing tables and seeds default data
 */
const pool = require('../config/database');

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database...\n');

    // 1. Create offers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        valid_from DATE,
        valid_until DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ offers table created/verified');

    // 2. Seed default offers
    const [existingOffers] = await pool.execute('SELECT COUNT(*) as cnt FROM offers');
    if (existingOffers[0].cnt === 0) {
      await pool.execute(`
        INSERT INTO offers (title, description, discount_percent, valid_from, valid_until) VALUES
        ('Welcome Offer', 'Get 10% off on your first order. Use code WELCOME10', 10, '2026-01-01', '2026-12-31'),
        ('Weekend Special', 'Enjoy 20% off on orders above Rs500 every weekend. Use FOOD20', 20, '2026-01-01', '2026-12-31'),
        ('Free Delivery', 'Free delivery on all orders above Rs400. No code needed!', 0, '2026-01-01', '2026-12-31')
      `);
      console.log('✅ Default offers seeded (3 offers)');
    } else {
      console.log('ℹ️  Offers table already has data - skipping');
    }

    // 3. Seed coupons if empty
    const [existingCoupons] = await pool.execute('SELECT COUNT(*) as cnt FROM coupons');
    if (existingCoupons[0].cnt === 0) {
      await pool.execute(`
        INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, is_active) VALUES
        ('WELCOME10', '10% off for new users', 'percentage', 10, 100, 150, 100, 1),
        ('FOOD20', '20% off on orders above 500', 'percentage', 20, 500, 300, 200, 1),
        ('FLAT50', 'Flat Rs50 off on any order', 'fixed', 50, 200, NULL, 500, 1),
        ('BIRYANI15', '15% off on Biryani orders', 'percentage', 15, 300, 200, 150, 1)
      `);
      console.log('✅ Default coupons seeded (4 coupons)');
    } else {
      console.log('ℹ️  Coupons already exist - skipping');
    }

    // 4. Ensure payments table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
        transaction_id VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ payments table created/verified');

    // 5. Add sqs_message_id and dynamodb_synced columns if missing
    try {
      await pool.execute('ALTER TABLE orders ADD COLUMN sqs_message_id VARCHAR(255) DEFAULT NULL');
      console.log('✅ Added sqs_message_id column to orders');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  sqs_message_id already exists');
      } else throw e;
    }

    try {
      await pool.execute('ALTER TABLE orders ADD COLUMN dynamodb_synced BOOLEAN DEFAULT FALSE');
      console.log('✅ Added dynamodb_synced column to orders');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  dynamodb_synced already exists');
      } else throw e;
    }

    console.log('\n🎉 Database fix complete!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

fixDatabase();
