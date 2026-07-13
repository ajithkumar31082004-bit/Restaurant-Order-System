-- ============================================================
--  FoodHub — Migration v2.0
--  Cloud-Native Smart Restaurant Management System
--  Run AFTER mysql.sql has been applied.
--  Safe: uses IF NOT EXISTS / IGNORE so it can be re-run.
-- ============================================================

USE restaurant_db;

-- ── 1. Extend existing tables ────────────────────────────────

-- users: add new roles
ALTER TABLE users MODIFY COLUMN role
  ENUM('customer','admin','waiter','chef','cashier','manager')
  DEFAULT 'customer';

-- orders: add dine-in / takeaway fields
ALTER TABLE orders
  ADD COLUMN order_type
    ENUM('delivery','takeaway','dine-in') DEFAULT 'delivery' AFTER order_id,
  ADD COLUMN table_id   INT DEFAULT NULL AFTER order_type,
  ADD COLUMN waiter_id  INT DEFAULT NULL AFTER table_id,
  ADD COLUMN scheduled_at TIMESTAMP NULL AFTER estimated_delivery,
  ADD COLUMN group_order_id INT DEFAULT NULL AFTER scheduled_at,
  ADD COLUMN service_charge DECIMAL(10,2) DEFAULT 0.00 AFTER tip_amount;

-- notifications: add new notification types
ALTER TABLE notifications MODIFY COLUMN type
  ENUM('order','promo','system','reward','reservation','kitchen','waitlist','waiter_request')
  DEFAULT 'system';

-- foods: add nutrition columns
ALTER TABLE foods
  ADD COLUMN protein_g   DECIMAL(6,2) DEFAULT NULL AFTER calories,
  ADD COLUMN fat_g       DECIMAL(6,2) DEFAULT NULL AFTER protein_g,
  ADD COLUMN carbs_g     DECIMAL(6,2) DEFAULT NULL AFTER fat_g,
  ADD COLUMN is_vegan    BOOLEAN DEFAULT FALSE AFTER is_veg,
  ADD COLUMN is_gluten_free BOOLEAN DEFAULT FALSE AFTER is_vegan,
  ADD COLUMN allergens   VARCHAR(255) DEFAULT NULL AFTER is_gluten_free;

-- ── 2. Branches ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  address     TEXT NOT NULL,
  phone       VARCHAR(20) DEFAULT NULL,
  manager_id  INT DEFAULT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO branches (id, name, city, address) VALUES
  (1, 'Main Branch', 'Chennai', 'No. 12, Anna Salai, Chennai - 600002');

-- ── 3. Restaurant Tables ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(10) NOT NULL UNIQUE,   -- e.g. T-01
  floor        ENUM('ground','first','rooftop') DEFAULT 'ground',
  table_type   ENUM('indoor','outdoor','vip','window','bar') DEFAULT 'indoor',
  capacity     INT NOT NULL DEFAULT 4,
  status       ENUM('available','occupied','reserved','cleaning','inactive')
                  DEFAULT 'available',
  branch_id    INT DEFAULT 1,
  qr_code_url  VARCHAR(500) DEFAULT NULL,
  position_x   INT DEFAULT 0 COMMENT 'Grid X position for floor map',
  position_y   INT DEFAULT 0 COMMENT 'Grid Y position for floor map',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_table_status (status),
  INDEX idx_table_floor (floor)
);

-- Seed 20 tables across 2 floors
INSERT IGNORE INTO restaurant_tables
  (table_number, floor, table_type, capacity, status, position_x, position_y) VALUES
  ('T-01','ground','indoor',  4,'available',0,0),
  ('T-02','ground','indoor',  4,'available',1,0),
  ('T-03','ground','indoor',  4,'available',2,0),
  ('T-04','ground','indoor',  2,'available',3,0),
  ('T-05','ground','window',  4,'available',0,1),
  ('T-06','ground','window',  4,'available',3,1),
  ('T-07','ground','outdoor', 6,'available',0,2),
  ('T-08','ground','outdoor', 6,'available',1,2),
  ('T-09','ground','outdoor', 4,'available',2,2),
  ('T-10','ground','vip',     8,'available',3,2),
  ('T-11','ground','vip',     6,'available',0,3),
  ('T-12','ground','indoor',  4,'available',1,3),
  ('T-13','ground','indoor',  4,'available',2,3),
  ('T-14','ground','bar',     2,'available',3,3),
  ('T-15','ground','bar',     2,'available',4,3),
  ('T-16','first','indoor',   4,'available',0,0),
  ('T-17','first','indoor',   4,'available',1,0),
  ('T-18','first','vip',      8,'available',2,0),
  ('T-19','first','outdoor',  6,'available',0,1),
  ('T-20','first','outdoor',  6,'available',1,1);

-- ── 4. Table Reservations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_reservations (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id   VARCHAR(20) NOT NULL UNIQUE,  -- e.g. RES000451
  user_id          INT DEFAULT NULL,
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20) NOT NULL,
  customer_email   VARCHAR(150) DEFAULT NULL,
  table_id         INT DEFAULT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guest_count      INT NOT NULL DEFAULT 2,
  table_preference ENUM('indoor','outdoor','vip','window','bar','any') DEFAULT 'any',
  special_event    ENUM('none','birthday','anniversary','business','engagement','other') DEFAULT 'none',
  special_requests TEXT DEFAULT NULL,
  status           ENUM('pending','confirmed','seated','completed','cancelled','no-show')
                      DEFAULT 'pending',
  confirmed_by     INT DEFAULT NULL,  -- admin/manager user_id
  branch_id        INT DEFAULT 1,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reservation_date (reservation_date),
  INDEX idx_reservation_status (status),
  INDEX idx_reservation_table (table_id)
);

-- ── 5. Kitchen Orders ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  order_id          INT NOT NULL,          -- FK to orders.id
  order_ref         VARCHAR(20) NOT NULL,  -- human-readable order_id
  table_number      VARCHAR(10) DEFAULT NULL,
  order_type        ENUM('delivery','takeaway','dine-in') DEFAULT 'delivery',
  status            ENUM('new','accepted','preparing','ready','served','cancelled')
                        DEFAULT 'new',
  priority          ENUM('normal','high','urgent') DEFAULT 'normal',
  assigned_chef_id  INT DEFAULT NULL,
  estimated_minutes INT DEFAULT 20,
  accepted_at       TIMESTAMP NULL,
  ready_at          TIMESTAMP NULL,
  served_at         TIMESTAMP NULL,
  notes             TEXT DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_chef_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_kitchen_status (status),
  INDEX idx_kitchen_created (created_at)
);

-- ── 6. Waiter Requests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiter_requests (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  table_id     INT NOT NULL,
  order_id     INT DEFAULT NULL,
  request_type ENUM('water','bill','tissue','assistance','food_ready','other')
                  DEFAULT 'assistance',
  message      VARCHAR(255) DEFAULT NULL,
  status       ENUM('pending','acknowledged','resolved') DEFAULT 'pending',
  waiter_id    INT DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at  TIMESTAMP NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_waiter_req_status (status),
  INDEX idx_waiter_req_table (table_id)
);

-- ── 7. Waiter Table Assignments ───────────────────────────────
CREATE TABLE IF NOT EXISTS waiter_assignments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  waiter_id  INT NOT NULL,
  table_id   INT NOT NULL,
  shift      ENUM('morning','afternoon','evening','night') DEFAULT 'morning',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  UNIQUE KEY unique_waiter_table (waiter_id, table_id)
);

-- ── 8. Inventory ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  item_name            VARCHAR(150) NOT NULL,
  category             ENUM('meat','vegetable','dairy','grain','spice','beverage','other')
                          DEFAULT 'other',
  quantity             DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit                 ENUM('kg','g','litre','ml','piece','dozen','pack') DEFAULT 'kg',
  low_stock_threshold  DECIMAL(10,3) DEFAULT 1.000,
  cost_per_unit        DECIMAL(10,2) DEFAULT 0.00,
  supplier_name        VARCHAR(150) DEFAULT NULL,
  branch_id            INT DEFAULT 1,
  last_restocked_at    TIMESTAMP NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_inventory_category (category)
);

-- Seed inventory items
INSERT IGNORE INTO inventory (item_name, category, quantity, unit, low_stock_threshold, cost_per_unit) VALUES
  ('Chicken',        'meat',      25.000, 'kg', 5.000, 220.00),
  ('Paneer',         'dairy',     10.000, 'kg', 2.000, 350.00),
  ('Basmati Rice',   'grain',     50.000, 'kg', 10.000, 80.00),
  ('Tomatoes',       'vegetable', 15.000, 'kg', 3.000, 40.00),
  ('Onions',         'vegetable', 20.000, 'kg', 5.000, 30.00),
  ('Butter',         'dairy',      5.000, 'kg', 1.000, 480.00),
  ('Cream',          'dairy',      4.000, 'litre', 0.500, 120.00),
  ('Cooking Oil',    'other',     10.000, 'litre', 2.000, 160.00),
  ('Wheat Flour',    'grain',     25.000, 'kg', 5.000, 45.00),
  ('Mozzarella',     'dairy',      5.000, 'kg', 1.000, 800.00),
  ('Bell Peppers',   'vegetable',  8.000, 'kg', 2.000, 60.00),
  ('Saffron',        'spice',      0.100, 'kg', 0.020, 25000.00),
  ('Cardamom',       'spice',      0.500, 'kg', 0.100, 1200.00),
  ('Mango Pulp',     'other',      5.000, 'litre', 1.000, 80.00),
  ('Chocolate',      'other',      3.000, 'kg', 0.500, 600.00),
  ('Milk',           'dairy',     20.000, 'litre', 5.000, 60.00),
  ('Yogurt',         'dairy',      8.000, 'kg', 2.000, 90.00),
  ('Pizza Dough',    'grain',     10.000, 'piece', 5.000, 25.00),
  ('Burger Buns',    'grain',     40.000, 'piece', 10.000, 10.00),
  ('Cola (Cans)',    'beverage',  48.000, 'piece', 12.000, 30.00);

-- ── 9. Inventory Purchases ────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_purchases (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id    INT NOT NULL,
  supplier_name   VARCHAR(150) NOT NULL,
  quantity        DECIMAL(10,3) NOT NULL,
  unit_cost       DECIMAL(10,2) NOT NULL,
  total_cost      DECIMAL(10,2) NOT NULL,
  invoice_number  VARCHAR(100) DEFAULT NULL,
  purchased_by    INT DEFAULT NULL,
  purchased_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (purchased_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_purchase_date (purchased_at)
);

-- ── 10. Employee Attendance ───────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_attendance (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  work_date    DATE NOT NULL,
  check_in     TIMESTAMP NULL,
  check_out    TIMESTAMP NULL,
  shift        ENUM('morning','afternoon','evening','night') DEFAULT 'morning',
  status       ENUM('present','absent','leave','half-day') DEFAULT 'present',
  notes        VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (user_id, work_date),
  INDEX idx_attendance_date (work_date)
);

-- ── 11. Feedback / Post-Dining Reviews ───────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT DEFAULT NULL,
  order_id         INT DEFAULT NULL,
  customer_name    VARCHAR(100) DEFAULT NULL,
  food_rating      TINYINT DEFAULT 5 CHECK (food_rating BETWEEN 1 AND 5),
  service_rating   TINYINT DEFAULT 5 CHECK (service_rating BETWEEN 1 AND 5),
  ambience_rating  TINYINT DEFAULT 5 CHECK (ambience_rating BETWEEN 1 AND 5),
  overall_rating   TINYINT DEFAULT 5 CHECK (overall_rating BETWEEN 1 AND 5),
  comment          TEXT DEFAULT NULL,
  sentiment        ENUM('positive','neutral','negative') DEFAULT NULL,
  ai_summary       TEXT DEFAULT NULL,
  is_published     BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_feedback_rating (overall_rating),
  INDEX idx_feedback_sentiment (sentiment)
);

-- ── 12. Loyalty Points ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_points (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  points_balance  INT DEFAULT 0,
  total_earned    INT DEFAULT 0,
  total_redeemed  INT DEFAULT 0,
  tier            ENUM('bronze','silver','gold','platinum') DEFAULT 'bronze',
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  points       INT NOT NULL,
  type         ENUM('earn','redeem','bonus','expire') DEFAULT 'earn',
  reference    VARCHAR(50) DEFAULT NULL,  -- order_id or coupon code
  description  VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_loyalty_user (user_id),
  INDEX idx_loyalty_type (type)
);

-- ── 13. Group Orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  session_code  VARCHAR(20) NOT NULL UNIQUE,
  table_id      INT DEFAULT NULL,
  host_user_id  INT DEFAULT NULL,
  status        ENUM('open','locked','paid','cancelled') DEFAULT 'open',
  split_type    ENUM('combined','equal','custom') DEFAULT 'combined',
  expires_at    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── 14. Waitlist ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20) NOT NULL,
  customer_email   VARCHAR(150) DEFAULT NULL,
  party_size       INT NOT NULL DEFAULT 2,
  preferred_date   DATE NOT NULL,
  preferred_time   TIME NOT NULL,
  status           ENUM('waiting','notified','seated','expired','cancelled') DEFAULT 'waiting',
  position         INT DEFAULT 0,
  notified_at      TIMESTAMP NULL,
  branch_id        INT DEFAULT 1,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_waitlist_date (preferred_date),
  INDEX idx_waitlist_status (status)
);

-- ── 15. Audit Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT DEFAULT NULL,
  action       VARCHAR(100) NOT NULL,   -- e.g. 'login', 'order.create', 'table.status'
  entity       VARCHAR(50) DEFAULT NULL,
  entity_id    INT DEFAULT NULL,
  old_value    JSON DEFAULT NULL,
  new_value    JSON DEFAULT NULL,
  ip_address   VARCHAR(45) DEFAULT NULL,
  user_agent   VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at)
);

-- ── 16. Foreign Keys on orders (run after tables exist) ───────
-- Only add if not already present (safe re-run)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = 'restaurant_db'
    AND TABLE_NAME = 'orders'
    AND CONSTRAINT_NAME = 'fk_orders_table'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists2 = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = 'restaurant_db'
    AND TABLE_NAME = 'orders'
    AND CONSTRAINT_NAME = 'fk_orders_waiter'
);

SET @sql2 = IF(@fk_exists2 = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_waiter FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT 'Migration v2.0 completed successfully!' AS result;
