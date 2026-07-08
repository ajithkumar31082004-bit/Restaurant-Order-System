# Restaurant Order System

A full-stack restaurant ordering platform with a modern responsive frontend, Node.js REST API, MySQL database, and AWS cloud integration for async order processing.

## Features

### Customer
- Browse menu with search, filters (category, price, veg/non-veg, offers)
- Shopping cart with coupons, GST, delivery charges, tips
- Checkout with multiple payment methods
- Order tracking timeline
- User registration & JWT authentication
- Profile, order history, favorites, rewards
- PDF invoice download
- Dark/Light theme, responsive design

### Admin
- Dashboard with stats & Chart.js analytics
- Manage foods, categories, orders, coupons, customers
- Update order status in real time
- Export orders to CSV / print PDF

### AWS Architecture
```
Customer → Website → Node.js API (EC2) → SQS → Lambda → DynamoDB → SNS → Notification
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | HTML5, CSS3, Bootstrap 5, JavaScript ES6, Font Awesome, SweetAlert2, Chart.js, AOS |
| Backend | Node.js, Express, JWT, bcrypt, Multer, Express Validator, Helmet, CORS, Morgan |
| Database | MySQL |
| AWS | EC2, SQS, Lambda, DynamoDB, SNS, CloudWatch, S3, IAM |

## Project Structure

```
restaurant-order-system/
├── frontend/
│   ├── css/style.css
│   ├── js/          # api, cart, utils, theme, components, admin
│   └── pages/       # customer + admin pages
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── aws/         # sqs.js, lambda/
│   ├── scripts/     # seedAdmin.js
│   └── server.js
├── database/mysql.sql
└── docs/
    ├── README.md
    ├── deployment.md
    └── postman_collection.json
```

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- (Optional) AWS account for SQS, Lambda, DynamoDB, SNS

### 1. Database Setup

```bash
mysql -u root -p < database/mysql.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

npm install
npm run seed    # Creates admin user
npm run dev     # Starts on http://localhost:5000
```

### 3. Access the Application

The backend serves the frontend automatically:

```
http://localhost:5000
```

Or open frontend pages directly via Live Server on port 5500 (API calls go to localhost:5000).

### Default Admin Login

| Email | Password |
|-------|----------|
| admin@restaurant.com | Admin@123 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Get profile (JWT) |
| GET | /api/foods | List foods (filters supported) |
| GET | /api/foods/:id | Get food by ID |
| POST | /api/foods | Create food (admin) |
| PUT | /api/foods/:id | Update food (admin) |
| DELETE | /api/foods/:id | Delete food (admin) |
| GET | /api/categories | List categories |
| POST | /api/orders | Place order |
| GET | /api/orders | List orders |
| GET | /api/orders/track/:id | Track order |
| GET | /api/orders/:id/invoice | Download PDF invoice |
| POST | /api/coupons/validate | Validate coupon |
| GET | /api/admin/dashboard | Dashboard stats (admin) |
| GET | /api/admin/health | Health check |

## Order Flow

1. Customer places order via `POST /api/orders`
2. Order saved in MySQL with status `Pending`
3. Order JSON sent to Amazon SQS
4. Lambda triggered → validates → stores in DynamoDB
5. SNS sends email/SMS confirmation
6. Admin updates status via dashboard

## Environment Variables

See `backend/.env.example` for all variables:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=restaurant_db
JWT_SECRET=your_secret
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs...
SNS_TOPIC_ARN=arn:aws:sns...
DYNAMODB_TABLE=RestaurantOrders
```

> AWS integration is optional for local development. Orders are always saved to MySQL even if SQS/SNS are not configured.

## Testing with Postman

Import `docs/postman_collection.json` into Postman. Set the `baseUrl` variable to `http://localhost:5000/api`.

## Deployment

See [deployment.md](deployment.md) for EC2, PM2, Nginx, Lambda, and AWS setup instructions.

## License

MIT
