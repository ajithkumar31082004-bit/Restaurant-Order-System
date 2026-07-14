-- Restaurant Order System - MySQL Database Schema
-- Run: mysql -u root -p < database/mysql.sql

CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    rewards_points INT DEFAULT 0,
    avatar VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
);

-- Admin table (extended admin info)
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    department VARCHAR(50) DEFAULT 'management',
    permissions JSON DEFAULT NULL,
    last_login TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_active (is_active)
);

-- Foods
CREATE TABLE IF NOT EXISTS foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    ingredients TEXT,
    calories INT DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2) DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    cooking_time INT DEFAULT 30 COMMENT 'Minutes',
    is_veg BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_special BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_foods_category (category_id),
    INDEX idx_foods_available (is_available),
    INDEX idx_foods_featured (is_featured),
    INDEX idx_foods_price (price)
);

-- Cart
CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    saved_for_later BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_food (user_id, food_id),
    INDEX idx_cart_user (user_id)
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0.00,
    max_discount DECIMAL(10, 2) DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coupons_code (code),
    INDEX idx_coupons_active (is_active)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL UNIQUE,
    user_id INT DEFAULT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(150) DEFAULT NULL,
    delivery_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    delivery_charge DECIMAL(10, 2) DEFAULT 0.00,
    tip_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    coupon_code VARCHAR(50) DEFAULT NULL,
    payment_method ENUM('COD', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking') DEFAULT 'COD',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    order_status ENUM('Pending', 'Confirmed', 'Preparing', 'Cooking', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    order_notes TEXT,
    estimated_delivery TIMESTAMP NULL,
    sqs_message_id VARCHAR(255) DEFAULT NULL,
    dynamodb_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_orders_order_id (order_id),
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (order_status),
    INDEX idx_orders_created (created_at)
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    food_id INT DEFAULT NULL,
    food_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL,
    INDEX idx_order_items_order (order_id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    transaction_id VARCHAR(100) DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_details JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_payments_order (order_id)
);

-- Favorites / Wishlist
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_favorite (user_id, food_id),
    INDEX idx_favorites_user (user_id)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    order_id INT DEFAULT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_reviews_food (food_id),
    INDEX idx_reviews_user (user_id)
);

-- Saved Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(50) DEFAULT 'Home',
    address_line TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addresses_user (user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'promo', 'system', 'reward') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id)
);

-- Offers / Promotions
CREATE TABLE IF NOT EXISTS offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image VARCHAR(255) DEFAULT NULL,
    discount_percent INT DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SEED DATA
-- =============================================

-- Admin user seeded via: node scripts/seedAdmin.js
-- Default credentials: admin@restaurant.com / Admin@123

-- Sample customer reviews (requires admin user id=1 from seed script)
INSERT INTO categories (name, description, sort_order) VALUES
('Starters', 'Appetizers and small bites', 1),
('Main Course', 'Hearty main dishes', 2),
('Biryani', 'Aromatic rice dishes', 3),
('Pizza', 'Wood-fired pizzas', 4),
('Burgers', 'Juicy burgers and wraps', 5),
('Desserts', 'Sweet treats', 6),
('Beverages', 'Drinks and refreshments', 7),
('Combos', 'Value meal combos', 8);

-- Foods
INSERT INTO foods (category_id, name, description, ingredients, calories, price, discount_price, rating, review_count, cooking_time, is_veg, is_featured, is_bestseller, is_special) VALUES
(1, 'Paneer Tikka', 'Grilled cottage cheese with spices', 'Paneer, bell peppers, onions, yogurt, spices', 280, 199.00, 179.00, 4.5, 120, 20, TRUE, TRUE, FALSE, TRUE),
(1, 'Chicken Wings', 'Crispy fried chicken wings', 'Chicken, flour, spices, hot sauce', 350, 249.00, NULL, 4.3, 85, 25, FALSE, TRUE, TRUE, FALSE),
(2, 'Butter Chicken', 'Creamy tomato-based curry', 'Chicken, butter, cream, tomatoes, spices', 450, 299.00, 269.00, 4.8, 200, 35, FALSE, TRUE, TRUE, TRUE),
(2, 'Paneer Butter Masala', 'Rich creamy paneer curry', 'Paneer, butter, cream, tomatoes', 380, 249.00, NULL, 4.6, 150, 30, TRUE, FALSE, TRUE, FALSE),
(3, 'Chicken Biryani', 'Aromatic basmati rice with chicken', 'Basmati rice, chicken, saffron, spices', 520, 299.00, 269.00, 4.9, 350, 40, FALSE, TRUE, TRUE, TRUE),
(3, 'Veg Biryani', 'Fragrant vegetable biryani', 'Basmati rice, mixed vegetables, spices', 420, 199.00, NULL, 4.4, 180, 35, TRUE, FALSE, FALSE, FALSE),
(4, 'Margherita Pizza', 'Classic tomato and mozzarella', 'Pizza dough, tomato sauce, mozzarella, basil', 280, 299.00, 249.00, 4.5, 90, 25, TRUE, TRUE, FALSE, FALSE),
(4, 'Chicken BBQ Pizza', 'BBQ chicken with onions', 'Pizza dough, BBQ sauce, chicken, onions, cheese', 380, 399.00, NULL, 4.7, 110, 30, FALSE, FALSE, TRUE, FALSE),
(5, 'Classic Burger', 'Beef patty with fresh veggies', 'Beef patty, lettuce, tomato, cheese, bun', 450, 199.00, NULL, 4.2, 75, 15, FALSE, FALSE, FALSE, FALSE),
(5, 'Veggie Burger', 'Plant-based patty burger', 'Veg patty, lettuce, tomato, vegan mayo, bun', 320, 179.00, 159.00, 4.0, 60, 15, TRUE, FALSE, FALSE, FALSE),
(6, 'Chocolate Brownie', 'Warm chocolate brownie with ice cream', 'Chocolate, flour, butter, vanilla ice cream', 380, 149.00, NULL, 4.6, 95, 10, TRUE, TRUE, FALSE, TRUE),
(6, 'Gulab Jamun', 'Traditional Indian sweet', 'Milk solids, sugar syrup, cardamom', 250, 99.00, NULL, 4.8, 200, 5, TRUE, FALSE, TRUE, FALSE),
(7, 'Mango Lassi', 'Refreshing mango yogurt drink', 'Mango, yogurt, sugar, cardamom', 180, 79.00, NULL, 4.5, 130, 5, TRUE, FALSE, FALSE, FALSE),
(7, 'Fresh Lime Soda', 'Zesty lime soda', 'Lime, soda, mint, sugar', 80, 59.00, NULL, 4.2, 80, 3, TRUE, FALSE, FALSE, FALSE),
(8, 'Family Feast Combo', '2 biryanis + 2 starters + dessert', 'Chicken biryani, paneer tikka, brownie', 1200, 799.00, 699.00, 4.7, 45, 45, FALSE, TRUE, TRUE, TRUE),
(8, 'Lunch Special Combo', 'Main + rice + beverage', 'Butter chicken, naan, lassi', 650, 349.00, 299.00, 4.5, 70, 30, FALSE, FALSE, FALSE, TRUE);

-- Coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_until) VALUES
('WELCOME10', '10% off on first order', 'percentage', 10.00, 200.00, 100.00, '2024-01-01', '2026-12-31'),
('FLAT50', 'Flat Rs 50 off', 'fixed', 50.00, 300.00, 50.00, '2024-01-01', '2026-12-31'),
('FOOD20', '20% off on orders above Rs 500', 'percentage', 20.00, 500.00, 200.00, '2024-01-01', '2026-12-31');

-- Offers
INSERT INTO offers (title, description, discount_percent, valid_from, valid_until) VALUES
('Weekend Special', 'Get 15% off on all combos this weekend', 15, '2024-01-01', '2026-12-31'),
('Free Delivery', 'Free delivery on orders above Rs 400', 0, '2024-01-01', '2026-12-31'),
('New User Offer', 'Flat Rs 100 off for new users', 0, '2024-01-01', '2026-12-31');

-- Reviews seeded after admin user is created via seedAdmin.js
