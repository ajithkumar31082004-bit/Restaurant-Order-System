# 🍕 FoodHub — Restaurant Order System

A full-stack restaurant ordering platform built with **Node.js**, **MySQL**, and **AWS cloud services**. Supports customer ordering, real-time order tracking, admin management, and event-driven order processing via SQS + Lambda + DynamoDB.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Local Setup](#-local-setup)
- [AWS Deployment](#-aws-deployment)
- [API Reference](#-api-reference)
- [Admin Panel](#-admin-panel)
- [Environment Variables](#-environment-variables)
- [Default Credentials](#-default-credentials)

---

## ✨ Features

### Customer
- 🍽️ Browse 210+ dishes with filters (category, veg/non-veg, offers, best sellers)
- 🔍 Real-time food search
- 🛒 Add to cart and checkout
- 💳 Apply coupon/promo codes
- 📦 Track order status in real-time
- 🧾 Download PDF invoice
- 👤 User profile & order history

### Admin Panel
- 📊 Dashboard with revenue, orders, and customer stats
- 🍕 Manage foods (add, edit, delete, image upload)
- 🗂️ Manage categories
- 🏷️ Manage coupons and discount offers
- 📋 View and update order statuses
- 👥 View and manage customers
- 📥 Export orders as CSV

### Backend
- 🔐 JWT authentication with role-based access
- 🚦 Rate limiting and helmet security
- 📤 Image uploads via Multer
- ☁️ AWS SQS for async order queuing
- ⚡ AWS Lambda for event-driven order processing
- 📬 AWS SNS for customer email/SMS notifications
- 📦 AWS DynamoDB for order analytics storage

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JS, Bootstrap 5 |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (primary), DynamoDB (analytics) |
| **Auth** | JWT (JSON Web Tokens) |
| **Cloud** | AWS EC2, RDS, SQS, Lambda, DynamoDB, SNS, S3 |
| **DevTools** | Nodemon, PM2, dotenv |

---

## 🏗️ Architecture

```
Customer Browser
      │
      ▼
 EC2 (Node.js Express + Static Frontend)
      │
      ├──► RDS MySQL          ← Orders, Users, Foods, Categories
      │
      ├──► SQS Queue          ← Async order payload
      │         │
      │         ▼
      │     Lambda            ← Auto-triggered processor
      │         ├──► DynamoDB ← Enriched order archive
      │         └──► SNS      ← Email/SMS to customer
      │
      └──► S3                 ← Food images storage
```

### Order Processing Flow
1. Customer places order on the website
2. Express saves order to **MySQL** (real-time status)
3. Express pushes payload to **Amazon SQS**
4. **AWS Lambda** is auto-triggered by SQS
5. Lambda enriches order (prep time, delivery ETA)
6. Lambda stores enriched order in **DynamoDB**
7. Lambda sends confirmation via **Amazon SNS** (email/SMS)

---

## 📁 Project Structure

```
restaurant-order-system/
├── backend/
│   ├── aws/
│   │   ├── lambda/              # Lambda function for SQS processing
│   │   └── sqs.js               # SQS + SNS integration
│   ├── config/
│   │   ├── config.js            # App configuration
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/             # Route handlers
│   ├── middleware/              # Auth, validation, upload, error handler
│   ├── models/                  # Sequelize/MySQL models
│   ├── routes/                  # Express route definitions
│   ├── scripts/
│   │   ├── setupDb.js           # Create database tables
│   │   ├── seedAdmin.js         # Create admin user
│   │   └── populateMenu.js      # Seed 210 food items
│   ├── uploads/                 # Food image storage
│   ├── server.js                # Express app entry point
│   └── .env                     # Environment variables
├── frontend/
│   ├── css/style.css            # Global styles
│   ├── js/
│   │   ├── api.js               # API service layer
│   │   ├── components.js        # Shared navbar/footer components
│   │   ├── cart.js              # Cart logic
│   │   ├── utils.js             # Utility helpers
│   │   ├── admin.js             # Admin panel logic
│   │   └── theme.js             # Dark/light mode
│   └── pages/
│       ├── index.html           # Homepage
│       ├── menu.html            # Menu with filters
│       ├── cart.html            # Shopping cart
│       ├── checkout.html        # Checkout form
│       ├── login.html           # Login page
│       ├── register.html        # Registration
│       ├── profile.html         # User profile & orders
│       ├── track-order.html     # Order tracking
│       ├── contact.html         # Contact page
│       ├── order-success.html   # Order confirmation
│       └── admin/               # Admin panel pages
│           ├── dashboard.html
│           ├── foods.html
│           ├── categories.html
│           ├── orders.html
│           ├── coupons.html
│           └── customers.html
└── database/
    └── mysql.sql                # Database schema
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js v16+
- MySQL 8.0+

### Step 1 — Clone & Install

```bash
git clone https://github.com/ajithkumar31082004-bit/Restaurant-Order-System.git
cd Restaurant-Order-System/restaurant-order-system/backend
npm install
```

### Step 2 — Configure Environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### Step 3 — Setup Database

```bash
# Create tables
node scripts/setupDb.js

# Seed admin user
node scripts/seedAdmin.js

# Seed 210 food items
node scripts/populateMenu.js
```

### Step 4 — Start the Server

```bash
npm run dev
```

### Step 5 — Open in Browser

```
http://localhost:5000
```

---

## ☁️ AWS Deployment

### Services Required

| Service | Purpose |
|---------|---------|
| EC2 | Host Node.js backend + frontend |
| RDS (MySQL) | Managed database |
| SQS | Async order message queue |
| Lambda | Serverless order processor |
| DynamoDB | Order analytics storage |
| SNS | Customer notifications |
| S3 | Food image uploads |

### Step-by-Step

#### 1. Launch EC2
```bash
# On EC2 (Amazon Linux 2)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g pm2

git clone https://github.com/ajithkumar31082004-bit/Restaurant-Order-System.git
cd Restaurant-Order-System/restaurant-order-system/backend
npm install
```

#### 2. Create RDS MySQL
- Engine: MySQL 8.0
- Instance: db.t4g.micro (free tier)
- Update `DB_HOST` in `.env` with the RDS endpoint

#### 3. Create SQS Queue
- Name: `restaurant-orders`
- Type: Standard Queue
- Copy Queue URL → set as `SQS_QUEUE_URL` in `.env`

#### 4. Create DynamoDB Table
- Table: `RestaurantOrders`
- Partition Key: `OrderID` (String)

#### 5. Deploy Lambda
```bash
cd backend/aws/lambda
npm install
zip -r lambda.zip .
# Upload lambda.zip to AWS Lambda Console
# Runtime: Node.js 20.x
# Add SQS trigger: select restaurant-orders queue
```

#### 6. Create SNS Topic
- Topic: `restaurant-order-notifications`
- Add Email subscription → confirm email
- Copy ARN → set as `SNS_TOPIC_ARN` in `.env`

#### 7. EC2 IAM Role Permissions
Attach a role with policies:
- `sqs:SendMessage`
- `sns:Publish`
- `s3:PutObject`, `s3:GetObject`
- `dynamodb:PutItem`, `dynamodb:GetItem`

#### 8. Start with PM2
```bash
pm2 start server.js --name restaurant
pm2 save
pm2 startup
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get logged-in user profile |

### Foods
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/foods` | Get all foods (supports filters) |
| GET | `/api/foods/:id` | Get single food |
| POST | `/api/foods` | Create food (admin) |
| PUT | `/api/foods/:id` | Update food (admin) |
| DELETE | `/api/foods/:id` | Delete food (admin) |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Create category (admin) |
| PUT | `/api/categories/:id` | Update category (admin) |
| DELETE | `/api/categories/:id` | Delete category (admin) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Place new order |
| GET | `/api/orders` | Get user orders |
| GET | `/api/orders/:id` | Get single order |
| GET | `/api/orders/track/:id` | Track order by ID |
| PUT | `/api/orders/:id` | Update order status (admin) |
| DELETE | `/api/orders/:id` | Delete order (admin) |

### Coupons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coupons/validate` | Validate coupon code |
| GET | `/api/coupons` | Get all coupons (admin) |
| POST | `/api/coupons` | Create coupon (admin) |
| PUT | `/api/coupons/:id` | Update coupon (admin) |
| DELETE | `/api/coupons/:id` | Delete coupon (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/users` | All users |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/export/orders` | Export orders as CSV |

---

## 🔧 Admin Panel

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/admin` | Stats overview |
| Foods | `/pages/admin/foods.html` | Manage food menu |
| Categories | `/pages/admin/categories.html` | Manage categories |
| Orders | `/pages/admin/orders.html` | View & update orders |
| Coupons | `/pages/admin/coupons.html` | Manage discount codes |
| Customers | `/pages/admin/customers.html` | View all customers |

---

## ⚙️ Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=restaurant_db
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/xxxx/restaurant-orders
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:xxxx:restaurant-order-notifications
DYNAMODB_TABLE=RestaurantOrders
S3_BUCKET=restaurant-images-bucket

# Frontend CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@restaurant.com` | `Admin@123` |

---

## 📄 License

MIT License — free to use and modify.
