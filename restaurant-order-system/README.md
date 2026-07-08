# Restaurant Order System

Full-stack restaurant ordering platform with Node.js, MySQL, and AWS.

**[Full documentation → docs/README.md](docs/README.md)**

## Quick Start

```bash
# 1. Database
mysql -u root -p < database/mysql.sql

# 2. Backend
cd backend
cp .env.example .env   # edit MySQL credentials
npm install
npm run seed
npm run dev

# 3. Open browser
http://localhost:5000
```

**Admin login:** `admin@restaurant.com` / `Admin@123`

## What's Included

- Customer website (10 pages) + Admin dashboard (6 pages)
- REST API with JWT auth
- MySQL schema with seed data
- AWS SQS → Lambda → DynamoDB → SNS integration
- Postman collection & EC2 deployment guide
