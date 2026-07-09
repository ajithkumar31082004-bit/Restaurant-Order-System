/**
 * 200-Item Menu Database Seeder — FoodHub
 * Executed via node scripts/populateMenu.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const categories = [
  { name: 'Starters', description: 'Appetizers and small bites to trigger your tastebuds', sort_order: 1 },
  { name: 'Soups', description: 'Warm and comforting soups', sort_order: 2 },
  { name: 'Salads', description: 'Fresh and healthy greens', sort_order: 3 },
  { name: 'Vegetarian Main Course', description: 'Delicious vegetable curries and dals', sort_order: 4 },
  { name: 'Paneer Specials', description: 'Rich and creamy cottage cheese delicacies', sort_order: 5 },
  { name: 'Chicken', description: 'Tender chicken preparations from Indian to Chinese styles', sort_order: 6 },
  { name: 'Mutton', description: 'Slow-cooked traditional goat meat dishes', sort_order: 7 },
  { name: 'Seafood', description: 'Fresh catch curries and pepper fries', sort_order: 8 },
  { name: 'Biryani', description: 'Aromatic basmati rice cooked with secret spices', sort_order: 9 },
  { name: 'Chinese', description: 'Wok-tossed noodles, fried rice, and gravies', sort_order: 10 },
  { name: 'Fast Food', description: 'Pizzas, burgers, and crispy fries', sort_order: 11 },
  { name: 'Desserts', description: 'Sweet endings to your meal', sort_order: 12 },
  { name: 'Beverages', description: 'Refreshing shakes, juices, and hot teas', sort_order: 13 }
];

const dishes = {
  'Starters': [
    { name: 'Veg Spring Roll', price: 180 },
    { name: 'Paneer Tikka', price: 280 },
    { name: 'Hara Bhara Kabab', price: 220 },
    { name: 'Crispy Corn', price: 210 },
    { name: 'Gobi Manchurian', price: 220 },
    { name: 'Veg Manchurian Dry', price: 230 },
    { name: 'Chilli Mushroom', price: 250 },
    { name: 'Baby Corn Pepper Fry', price: 240 },
    { name: 'Paneer 65', price: 290 },
    { name: 'Cheese Balls', price: 260 },
    { name: 'Chicken 65', price: 320 },
    { name: 'Chicken Lollipop', price: 340 },
    { name: 'Chicken Wings', price: 360 },
    { name: 'Pepper Chicken', price: 380 },
    { name: 'Dragon Chicken', price: 390 },
    { name: 'Chicken Tikka', price: 420 },
    { name: 'Fish Fingers', price: 450 },
    { name: 'Prawn Fry', price: 520 },
    { name: 'Mutton Pepper Fry', price: 480 },
    { name: 'Tandoori Chicken (Half)', price: 420 }
  ],
  'Soups': [
    { name: 'Tomato Soup', price: 140 },
    { name: 'Sweet Corn Soup', price: 150 },
    { name: 'Hot & Sour Soup', price: 170 },
    { name: 'Veg Manchow Soup', price: 180 },
    { name: 'Mushroom Soup', price: 180 },
    { name: 'Chicken Clear Soup', price: 190 },
    { name: 'Chicken Manchow Soup', price: 200 },
    { name: 'Chicken Hot & Sour', price: 210 },
    { name: 'Seafood Soup', price: 260 },
    { name: 'Cream of Chicken Soup', price: 220 }
  ],
  'Salads': [
    { name: 'Green Salad', price: 120 },
    { name: 'Caesar Salad', price: 220 },
    { name: 'Greek Salad', price: 250 },
    { name: 'Paneer Salad', price: 240 },
    { name: 'Chicken Salad', price: 280 },
    { name: 'Corn Salad', price: 180 },
    { name: 'Fruit Salad', price: 200 },
    { name: 'Russian Salad', price: 220 },
    { name: 'Sprouts Salad', price: 170 },
    { name: 'Cucumber Salad', price: 100 }
  ],
  'Vegetarian Main Course': [
    { name: 'Veg Kurma', price: 220 },
    { name: 'Mix Veg Curry', price: 240 },
    { name: 'Veg Kolhapuri', price: 250 },
    { name: 'Veg Jalfrezi', price: 250 },
    { name: 'Dal Fry', price: 180 },
    { name: 'Dal Tadka', price: 200 },
    { name: 'Dal Makhani', price: 240 },
    { name: 'Chana Masala', price: 220 },
    { name: 'Rajma Masala', price: 220 },
    { name: 'Aloo Gobi', price: 210 },
    { name: 'Jeera Aloo', price: 190 },
    { name: 'Dum Aloo', price: 230 },
    { name: 'Bhindi Masala', price: 220 },
    { name: 'Veg Kadai', price: 240 },
    { name: 'Veg Handi', price: 260 },
    { name: 'Mushroom Masala', price: 270 },
    { name: 'Mushroom Pepper', price: 290 },
    { name: 'Palak Corn', price: 240 },
    { name: 'Palak Mushroom', price: 260 },
    { name: 'Veg Hyderabadi', price: 270 },
    { name: 'Malai Kofta', price: 280 },
    { name: 'Navratan Korma', price: 290 },
    { name: 'Veg Butter Masala', price: 260 },
    { name: 'Kashmiri Dum Aloo', price: 250 },
    { name: 'Veg Chettinad', price: 270 }
  ],
  'Paneer Specials': [
    { name: 'Paneer Butter Masala', price: 290 },
    { name: 'Kadai Paneer', price: 300 },
    { name: 'Palak Paneer', price: 280 },
    { name: 'Shahi Paneer', price: 320 },
    { name: 'Paneer Lababdar', price: 320 },
    { name: 'Paneer Do Pyaza', price: 300 },
    { name: 'Paneer Tikka Masala', price: 330 },
    { name: 'Paneer Bhurji', price: 280 },
    { name: 'Paneer Kolhapuri', price: 310 },
    { name: 'Paneer Chettinad', price: 320 },
    { name: 'Paneer Makhani', price: 330 },
    { name: 'Paneer Pepper Masala', price: 320 },
    { name: 'Paneer Curry', price: 290 },
    { name: 'Achari Paneer', price: 310 },
    { name: 'Paneer Hyderabadi', price: 330 }
  ],
  'Chicken': [
    { name: 'Butter Chicken', price: 380 },
    { name: 'Chicken Curry', price: 340 },
    { name: 'Chicken Masala', price: 350 },
    { name: 'Chicken Chettinad', price: 380 },
    { name: 'Chicken Kadai', price: 360 },
    { name: 'Chicken Kolhapuri', price: 360 },
    { name: 'Chicken Pepper Masala', price: 370 },
    { name: 'Chicken Vindaloo', price: 360 },
    { name: 'Chicken Do Pyaza', price: 350 },
    { name: 'Chicken Mughlai', price: 390 },
    { name: 'Chicken Tikka Masala', price: 420 },
    { name: 'Chicken Roast', price: 420 },
    { name: 'Garlic Chicken', price: 380 },
    { name: 'Lemon Chicken', price: 360 },
    { name: 'Chilli Chicken', price: 330 },
    { name: 'Chicken Manchurian', price: 340 },
    { name: 'Chicken Fried Rice', price: 280 },
    { name: 'Chicken Noodles', price: 270 },
    { name: 'Schezwan Chicken', price: 360 },
    { name: 'Dragon Chicken', price: 390 },
    { name: 'Chicken Keema', price: 370 },
    { name: 'Chicken Stew', price: 350 },
    { name: 'Chicken Pepper Fry', price: 390 },
    { name: 'Chicken Sukka', price: 380 },
    { name: 'Chicken Roast Kerala', price: 420 },
    { name: 'Chicken Ghee Roast', price: 450 },
    { name: 'Chicken Handi', price: 390 },
    { name: 'Chicken Hyderabadi', price: 400 },
    { name: 'Chicken Curry Boneless', price: 420 },
    { name: 'Grilled Chicken', price: 440 }
  ],
  'Mutton': [
    { name: 'Mutton Curry', price: 480 },
    { name: 'Mutton Rogan Josh', price: 520 },
    { name: 'Mutton Pepper Fry', price: 540 },
    { name: 'Mutton Sukka', price: 520 },
    { name: 'Mutton Masala', price: 500 },
    { name: 'Mutton Korma', price: 520 },
    { name: 'Mutton Chettinad', price: 540 },
    { name: 'Mutton Handi', price: 530 },
    { name: 'Mutton Keema', price: 500 },
    { name: 'Mutton Stew', price: 480 },
    { name: 'Mutton Chops', price: 560 },
    { name: 'Mutton Liver Fry', price: 460 },
    { name: 'Mutton Brain Fry', price: 450 },
    { name: 'Mutton Boti Masala', price: 520 },
    { name: 'Mutton Ghee Roast', price: 580 }
  ],
  'Seafood': [
    { name: 'Fish Curry', price: 420 },
    { name: 'Fish Fry', price: 450 },
    { name: 'Fish Tikka', price: 480 },
    { name: 'Fish Fingers', price: 450 },
    { name: 'Fish Masala', price: 460 },
    { name: 'Prawn Curry', price: 520 },
    { name: 'Prawn Fry', price: 540 },
    { name: 'Prawn Masala', price: 560 },
    { name: 'Prawn Pepper Fry', price: 580 },
    { name: 'Prawn Ghee Roast', price: 620 },
    { name: 'Squid Fry', price: 500 },
    { name: 'Squid Pepper Fry', price: 520 },
    { name: 'Crab Masala', price: 650 },
    { name: 'Crab Pepper Fry', price: 680 },
    { name: 'Seafood Platter', price: 950 }
  ],
  'Biryani': [
    { name: 'Chicken Biryani', price: 280 },
    { name: 'Chicken Dum Biryani', price: 320 },
    { name: 'Chicken Boneless Biryani', price: 340 },
    { name: 'Chicken 65 Biryani', price: 350 },
    { name: 'Chicken Tikka Biryani', price: 380 },
    { name: 'Mutton Biryani', price: 420 },
    { name: 'Mutton Dum Biryani', price: 450 },
    { name: 'Keema Biryani', price: 380 },
    { name: 'Fish Biryani', price: 380 },
    { name: 'Prawn Biryani', price: 450 },
    { name: 'Egg Biryani', price: 220 },
    { name: 'Veg Biryani', price: 220 },
    { name: 'Paneer Biryani', price: 260 },
    { name: 'Mushroom Biryani', price: 250 },
    { name: 'Hyderabadi Biryani', price: 340 },
    { name: 'Chettinad Chicken Biryani', price: 360 },
    { name: 'Ambur Chicken Biryani', price: 340 },
    { name: 'Dindigul Biryani', price: 350 },
    { name: 'Kuska', price: 150 },
    { name: 'Family Pack Chicken Biryani', price: 780 }
  ],
  'Chinese': [
    { name: 'Veg Fried Rice', price: 220 },
    { name: 'Veg Noodles', price: 220 },
    { name: 'Schezwan Fried Rice', price: 260 },
    { name: 'Schezwan Noodles', price: 260 },
    { name: 'Chicken Fried Rice', price: 280 },
    { name: 'Chicken Noodles', price: 280 },
    { name: 'Mixed Fried Rice', price: 340 },
    { name: 'Mixed Noodles', price: 340 },
    { name: 'Egg Fried Rice', price: 240 },
    { name: 'Egg Noodles', price: 240 },
    { name: 'Gobi Manchurian Gravy', price: 240 },
    { name: 'Chicken Manchurian', price: 340 },
    { name: 'Chilli Paneer', price: 300 },
    { name: 'Dragon Chicken', price: 390 },
    { name: 'American Chopsuey', price: 320 }
  ],
  'Fast Food': [
    { name: 'Margherita Pizza', price: 299 },
    { name: 'Veg Supreme Pizza', price: 399 },
    { name: 'Chicken Pizza', price: 449 },
    { name: 'Cheese Burger', price: 249 },
    { name: 'Chicken Burger', price: 299 },
    { name: 'French Fries', price: 149 },
    { name: 'Loaded Fries', price: 249 },
    { name: 'Veg Sandwich', price: 199 },
    { name: 'Chicken Sandwich', price: 249 },
    { name: 'Hot Dog', price: 199 }
  ],
  'Desserts': [
    { name: 'Gulab Jamun', price: 120 },
    { name: 'Rasgulla', price: 120 },
    { name: 'Brownie', price: 180 },
    { name: 'Chocolate Lava Cake', price: 220 },
    { name: 'Ice Cream Sundae', price: 240 },
    { name: 'Falooda', price: 220 },
    { name: 'Fruit Custard', price: 180 },
    { name: 'Kulfi', price: 140 },
    { name: 'Caramel Pudding', price: 180 },
    { name: 'Cheesecake', price: 260 }
  ],
  'Beverages': [
    { name: 'Mineral Water', price: 30 },
    { name: 'Fresh Lime Soda', price: 90 },
    { name: 'Lemon Juice', price: 80 },
    { name: 'Mango Juice', price: 120 },
    { name: 'Orange Juice', price: 120 },
    { name: 'Watermelon Juice', price: 120 },
    { name: 'Cold Coffee', price: 180 },
    { name: 'Hot Coffee', price: 100 },
    { name: 'Masala Tea', price: 80 },
    { name: 'Green Tea', price: 90 },
    { name: 'Chocolate Milkshake', price: 180 },
    { name: 'Oreo Shake', price: 220 },
    { name: 'Vanilla Shake', price: 180 },
    { name: 'Fresh Coconut Water', price: 70 },
    { name: 'Soft Drink (300ml)', price: 60 }
  ]
};

// Simple helper to check if dish is veg or non-veg
function checkVeg(dishName, categoryName) {
  if (['Chicken', 'Mutton', 'Seafood'].includes(categoryName)) return false;
  if (categoryName === 'Paneer Specials' || categoryName === 'Vegetarian Main Course' || categoryName === 'Salads') {
    if (dishName.toLowerCase().includes('chicken')) return false;
    return true;
  }
  const nvKeywords = ['chicken', 'mutton', 'prawn', 'fish', 'squid', 'crab', 'seafood', 'egg', 'lollipop', 'wings', 'beef'];
  const nameLower = dishName.toLowerCase();
  return !nvKeywords.some(keyword => nameLower.includes(keyword));
}

async function run() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_db',
    port: parseInt(process.env.DB_PORT, 10) || 3306
  };

  console.log('Connecting to database...');
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('Disabling foreign keys to truncate lists...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE order_items');
    await conn.query('TRUNCATE TABLE cart');
    await conn.query('TRUNCATE TABLE favorites');
    await conn.query('TRUNCATE TABLE reviews');
    await conn.query('TRUNCATE TABLE foods');
    await conn.query('TRUNCATE TABLE categories');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Old menu lists truncated.');

    const catIdMap = {};

    console.log('Inserting new categories...');
    for (const cat of categories) {
      const [res] = await conn.query(
        'INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)',
        [cat.name, cat.description, cat.sort_order]
      );
      catIdMap[cat.name] = res.insertId;
    }
    console.log('Categories inserted successfully.');

    console.log('Inserting 200 food items...');
    let totalInserted = 0;
    
    for (const [catName, foodList] of Object.entries(dishes)) {
      const categoryId = catIdMap[catName];
      
      for (const food of foodList) {
        const isVeg = checkVeg(food.name, catName);
        const description = `Freshly prepared delicious ${food.name} cooked with high quality ingredients.`;
        const rating = (4.0 + Math.random() * 0.9).toFixed(1);
        const reviewCount = Math.floor(10 + Math.random() * 190);
        const calories = isVeg ? Math.floor(150 + Math.random() * 250) : Math.floor(250 + Math.random() * 350);
        const cookingTime = Math.floor(15 + Math.random() * 25);
        const discountPrice = Math.random() > 0.75 ? Math.round(food.price * 0.9) : null;
        const isBestseller = Math.random() > 0.85;
        const isFeatured = Math.random() > 0.85;
        const isSpecial = Math.random() > 0.9;
        const ingredients = isVeg 
          ? 'Fresh local organic vegetables, authentic home spices, salt, herbs' 
          : 'Premium fresh meat/seafood, onion, tomato, home spices, garlic, ginger';

        await conn.query(
          `INSERT INTO foods (category_id, name, description, ingredients, calories, price, discount_price, rating, review_count, cooking_time, is_veg, is_available, is_featured, is_bestseller, is_special)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryId, food.name, description, ingredients, calories, food.price, discountPrice,
            rating, reviewCount, cookingTime, isVeg, true, isFeatured, isBestseller, isSpecial
          ]
        );
        totalInserted++;
      }
    }

    console.log(`Seeding complete. Inserted ${totalInserted} items successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('Migration seeder failed:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
