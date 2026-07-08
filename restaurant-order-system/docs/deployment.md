# Deployment Guide – Restaurant Order System

This guide covers deploying the backend to **Amazon EC2** and configuring **AWS services** for production.

---

## 1. EC2 Instance Setup

### Launch Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: t2.micro (minimum) or t3.small (recommended)
- Security Group inbound rules:
  - SSH (22) – your IP
  - HTTP (80) – 0.0.0.0/0
  - HTTPS (443) – 0.0.0.0/0
  - Custom TCP (5000) – optional for direct API access

### Connect & Install Dependencies

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-client
sudo npm install -g pm2
```

### Clone & Configure

```bash
git clone <your-repo-url> restaurant-order-system
cd restaurant-order-system/backend
cp .env.example .env
nano .env
```

Production `.env` example:

```env
PORT=5000
NODE_ENV=production
DB_HOST=<RDS_ENDPOINT_OR_LOCAL_MYSQL>
DB_USER=admin
DB_PASSWORD=<secure_password>
DB_NAME=restaurant_db
JWT_SECRET=<long_random_string>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/ACCOUNT/restaurant-orders
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT:restaurant-order-notifications
DYNAMODB_TABLE=RestaurantOrders
FRONTEND_URL=https://yourdomain.com
```

```bash
npm install --production
npm run seed
pm2 start server.js --name restaurant-api
pm2 save
pm2 startup
```

---

## 2. Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/restaurant
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/restaurant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 3. MySQL on RDS (Recommended)

1. Create RDS MySQL 8.0 instance
2. Set VPC security group to allow EC2 access on port 3306
3. Import schema:

```bash
mysql -h <RDS_ENDPOINT> -u admin -p < database/mysql.sql
cd backend && npm run seed
```

---

## 4. Amazon SQS

### Create Queue
1. AWS Console → SQS → Create queue
2. Name: `restaurant-orders`
3. Type: Standard
4. Enable **Dead Letter Queue** for failed messages
5. Copy Queue URL to `SQS_QUEUE_URL`

### IAM Policy (EC2 Role)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage", "sqs:GetQueueUrl"],
      "Resource": "arn:aws:sqs:us-east-1:ACCOUNT:restaurant-orders"
    }
  ]
}
```

---

## 5. AWS Lambda

### Package & Deploy

```bash
cd backend/aws/lambda
npm install --production
zip -r lambda.zip lambda_function.js node_modules/
```

### Create Lambda Function
- Runtime: Node.js 20.x
- Handler: `lambda_function.handler`
- Environment variables:
  - `AWS_REGION=us-east-1`
  - `DYNAMODB_TABLE=RestaurantOrders`

### Add SQS Trigger
- Event source: `restaurant-orders` queue
- Batch size: 10
- Enable **Report batch item failures** for retry support

### IAM Policy (Lambda Role)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 6. Amazon DynamoDB

### Create Table
| Setting | Value |
|---------|-------|
| Table name | RestaurantOrders |
| Partition key | OrderID (String) |
| Billing | On-demand |

Attributes stored: CustomerName, Phone, Email, Address, Items, Total, Payment, Status, Timestamp

---

## 7. Amazon SNS

### Create Topic
1. Name: `restaurant-order-notifications`
2. Create email/SMS subscriptions
3. Copy Topic ARN to `SNS_TOPIC_ARN`

### IAM Policy (EC2 Role)

```json
{
  "Effect": "Allow",
  "Action": "sns:Publish",
  "Resource": "arn:aws:sns:us-east-1:ACCOUNT:restaurant-order-notifications"
}
```

---

## 8. Amazon S3 (Food Images)

1. Create bucket: `restaurant-images-bucket`
2. Enable public read for `/uploads/*` or use CloudFront
3. Set `S3_BUCKET` in `.env`
4. (Optional) Replace Multer local storage with S3 SDK upload

---

## 9. CloudWatch

- Lambda logs: `/aws/lambda/restaurant-order-processor`
- EC2/PM2 logs: `pm2 logs restaurant-api`
- Create alarms for Lambda errors and SQS DLQ depth

---

## 10. Health Check

```bash
curl https://yourdomain.com/api/admin/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-07-07T...",
  "uptime": 3600
}
```

---

## 11. Daily Backup Script

```bash
#!/bin/bash
# /home/ubuntu/backup.sh
DATE=$(date +%Y%m%d)
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD restaurant_db > /backups/restaurant_$DATE.sql
aws s3 cp /backups/restaurant_$DATE.sql s3://your-backup-bucket/
```

Add to crontab: `0 2 * * * /home/ubuntu/backup.sh`

---

## Architecture Diagram

```
Customer Browser
      ↓
  Nginx (HTTPS)
      ↓
  Node.js API (PM2 on EC2)
      ↓
  MySQL (RDS) ← order metadata
      ↓
  Amazon SQS
      ↓
  AWS Lambda
      ↓
  DynamoDB ← processed orders
      ↓
  Amazon SNS → Email/SMS confirmation
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Set `FRONTEND_URL` in `.env` |
| MySQL connection refused | Check RDS security group |
| SQS not sending | Verify IAM role & queue URL |
| Lambda not triggering | Check SQS trigger & DLQ |
| 502 Bad Gateway | Run `pm2 status`, check Nginx config |
