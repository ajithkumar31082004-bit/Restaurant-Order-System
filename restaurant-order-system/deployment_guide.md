# 🚀 FoodHub — Ultra Detailed AWS Deployment Guide
### Every step, every click, every command explained

---

## 📌 Before You Start — Read This

| Item | Detail |
|------|--------|
| AWS Region | Use **us-east-1 (N. Virginia)** throughout. Don't mix regions. |
| Free Tier | EC2 t2.micro + RDS t3.micro + DynamoDB on-demand = Free Tier eligible |
| Time needed | ~2 hours for first-time setup |
| What you need | AWS Account, your GitHub project, a PC with PowerShell |

---

## ═══════════════════════════════════
## PHASE 1 — AWS CONSOLE SETUP
## ═══════════════════════════════════

---

## STEP 1 — Create IAM User & Access Keys

> **Why?** Your EC2 server needs credentials to call SQS, DynamoDB, SNS, S3.

### 1.1 — Open IAM

1. Log into [https://console.aws.amazon.com](https://console.aws.amazon.com)
2. In the top search bar, type **IAM** → Click **IAM**
3. In the left sidebar, click **Users**
4. Click the orange **Create user** button (top right)

### 1.2 — Fill User Details

| Field | Value |
|-------|-------|
| User name | `restaurant-app-user` |
| AWS Management Console access | **Leave unchecked** (we only need API keys) |

Click **Next**

### 1.3 — Set Permissions

1. Select **Attach policies directly**
2. In the search box, search and check each of these:
   - ✅ `AmazonSQSFullAccess`
   - ✅ `AmazonSNSFullAccess`
   - ✅ `AmazonDynamoDBFullAccess`
   - ✅ `AmazonS3FullAccess`
3. Click **Next** → Click **Create user**

### 1.4 — Create Access Keys

1. Click on `restaurant-app-user` from the users list
2. Click the **Security credentials** tab
3. Scroll down to **Access keys** section
4. Click **Create access key**
5. Select **Application running on AWS compute** → Click **Next**
6. Description tag: `restaurant-ec2-key` → Click **Create access key**
7. You will see:
   - **Access key ID** → looks like `AKIAIOSFODNN7EXAMPLE`
   - **Secret access key** → looks like `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
8. Click **Download .csv file** → Save this file safely
9. Click **Done**

> [!CAUTION]
> This is the **only time** you can see the Secret Access Key. If you lose it, you must create a new one.

---

## STEP 2 — Create SQS Queue

> **Why?** SQS is the message buffer between your Express server and Lambda.

### 2.1 — Open SQS

1. In the top search bar, type **SQS** → Click **Simple Queue Service**
2. Make sure the region (top right) shows **N. Virginia (us-east-1)**
3. Click **Create queue**

### 2.2 — Queue Settings

| Field | Value |
|-------|-------|
| Type | **Standard** |
| Name | `restaurant-orders` |

Leave all other settings (visibility timeout, message retention, etc.) at defaults.

### 2.3 — Enable Dead Letter Queue (DLQ)

1. Scroll down to **Dead-letter queue** section
2. Click **Enabled**
3. Click **Create new queue** (opens in new tab):
   - Type: **Standard**
   - Name: `restaurant-orders-dlq`
   - Click **Create queue**
   - Close that tab and go back
4. Refresh the DLQ dropdown → select `restaurant-orders-dlq`
5. Maximum receives: **3**

Click **Create queue** (orange button)

### 2.4 — Copy the Queue URL

1. After creation, click on `restaurant-orders` from the list
2. You will see the **URL** at the top:
   ```
   https://sqs.us-east-1.amazonaws.com/123456789012/restaurant-orders
   ```
3. **Copy this URL and paste it in Notepad** — you'll need it for `.env`

---

## STEP 3 — Create DynamoDB Table

> **Why?** Lambda writes enriched order records to DynamoDB after processing.

### 3.1 — Open DynamoDB

1. Search **DynamoDB** in top bar → Click it
2. Click **Create table** (orange button)

### 3.2 — Table Settings

| Field | Value |
|-------|-------|
| Table name | `RestaurantOrders` |
| Partition key | `OrderID` |
| Partition key type | **String** |
| Sort key | *Leave empty* |

### 3.3 — Table Settings (Billing Mode)

1. Under **Table settings**, select **Customize settings**
2. Under **Read/write capacity settings**:
   - Select **On-demand** (no fixed cost — you pay only per request)
3. Leave everything else at default

Click **Create table** (orange button)

Wait until the status changes from **Creating** → **Active** (takes ~30 seconds, refresh the page).

---

## STEP 4 — Create SNS Topic

> **Why?** Lambda uses SNS to send email/SMS order confirmation to the customer.

### 4.1 — Open SNS

1. Search **SNS** in top bar → Click **Simple Notification Service**
2. In the left sidebar, click **Topics**
3. Click **Create topic** (orange button)

### 4.2 — Topic Settings

| Field | Value |
|-------|-------|
| Type | **Standard** |
| Name | `restaurant-order-notifications` |
| Display name | `FoodHub Orders` |

Leave everything else at default. Click **Create topic**.

### 4.3 — Copy the Topic ARN

1. After creation, you'll see the **ARN**:
   ```
   arn:aws:sns:us-east-1:123456789012:restaurant-order-notifications
   ```
2. **Copy this ARN and paste it in Notepad**

### 4.4 — Add Email Subscription

1. Click **Create subscription**
2. Fill in:

| Field | Value |
|-------|-------|
| Topic ARN | (already filled) |
| Protocol | **Email** |
| Endpoint | your-email@gmail.com |

3. Click **Create subscription**
4. **Go to your email inbox** → Find the email from AWS → Click **Confirm subscription**
5. After confirmation, go back to SNS → the subscription Status should say **Confirmed**

---

## STEP 5 — Create S3 Bucket

> **Why?** Admin panel uploads food images; they are stored in S3.

### 5.1 — Open S3

1. Search **S3** in top bar → Click **S3**
2. Click **Create bucket**

### 5.2 — Bucket Settings

| Field | Value |
|-------|-------|
| Bucket name | `restaurant-images-ajith` *(must be globally unique — add your name)* |
| AWS Region | **US East (N. Virginia) us-east-1** |

### 5.3 — Public Access Settings

1. Under **Block Public Access settings for this bucket**:
   - **Uncheck** "Block all public access"
2. A warning appears → Check the **"I acknowledge..."** checkbox

### 5.4 — Create the Bucket

Click **Create bucket** (orange button at bottom).

### 5.5 — Add Public Read Policy

1. Click on your bucket name from the list
2. Click the **Permissions** tab
3. Scroll down to **Bucket policy** → Click **Edit**
4. Paste this (replace `restaurant-images-ajith` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::restaurant-images-ajith/*"
    }
  ]
}
```

5. Click **Save changes**

---

## STEP 6 — Package & Deploy Lambda Function

> **Why?** Lambda auto-processes every order message that arrives in SQS.

### 6.1 — Package Lambda on Your PC (Windows PowerShell)

Open **PowerShell** and run:

```powershell
# Go to the lambda folder
cd "C:\Users\ajith\Downloads\Restaurant Order System\restaurant-order-system\backend\aws\lambda"

# Install dependencies
npm install

# Create zip archive
Compress-Archive -Path * -DestinationPath lambda.zip -Force

# Verify the zip was created
dir lambda.zip
```

You should see `lambda.zip` created in that folder.

### 6.2 — Create Lambda Function

1. Search **Lambda** in top bar → Click **Lambda**
2. Click **Create function** (orange button)
3. Select **Author from scratch**

| Field | Value |
|-------|-------|
| Function name | `RestaurantOrderProcessor` |
| Runtime | **Node.js 20.x** |
| Architecture | `x86_64` |

4. Under **Execution role**:
   - Select **Create a new role with basic Lambda permissions**
5. Click **Create function**

### 6.3 — Upload Lambda ZIP

1. In the function page, under **Code** tab
2. Click **Upload from** dropdown → Select **.zip file**
3. Click **Upload** → Browse to your `lambda.zip` → Open
4. Click **Save**

### 6.4 — Verify Handler Name

1. In the **Code** tab, scroll down to **Runtime settings**
2. Click **Edit**
3. Handler must be: `lambda_function.handler`
4. Click **Save**

### 6.5 — Set Environment Variables

1. Click the **Configuration** tab
2. Left sidebar → **Environment variables** → Click **Edit**
3. Click **Add environment variable**:

| Key | Value |
|-----|-------|
| `DYNAMODB_TABLE` | `RestaurantOrders` |
| `AWS_REGION` | `us-east-1` |

4. Click **Save**

### 6.6 — Give Lambda Permissions (IAM Role)

1. Still in **Configuration** tab → **Permissions** (left sidebar)
2. Under **Execution role**, click the role name link (opens IAM in new tab)
3. Click **Add permissions** → **Attach policies**
4. Search and check each:
   - ✅ `AmazonDynamoDBFullAccess`
   - ✅ `AmazonSNSFullAccess`
   - ✅ `AWSLambdaSQSQueueExecutionRole`
5. Click **Add permissions**
6. Close the IAM tab and go back to Lambda

### 6.7 — Add SQS Trigger to Lambda

1. Click the **Configuration** tab → **Triggers** → **Add trigger**
2. Select **SQS** from the dropdown
3. SQS queue: select `restaurant-orders` from dropdown
4. Batch size: **1** (process one order at a time)
5. Leave **Activate trigger** checked
6. Click **Add**

✅ Now Lambda will automatically fire every time an order arrives in SQS.

---

## STEP 7 — Launch EC2 Instance

> **Why?** EC2 hosts your Node.js Express backend and serves the frontend.

### 7.1 — Open EC2

1. Search **EC2** in top bar → Click **EC2**
2. Click **Launch instance** (orange button)

### 7.2 — Configure the Instance

| Field | Value |
|-------|-------|
| Name | `restaurant-server` |
| AMI | **Amazon Linux 2023 AMI** (first result, free tier eligible) |
| Instance type | **t2.micro** (Free tier eligible) |

### 7.3 — Key Pair (SSH Access)

1. Click **Create new key pair**
2. Key pair name: `restaurant-key`
3. Key pair type: **RSA**
4. Private key file format: **.pem**
5. Click **Create key pair**
6. The `.pem` file will automatically download → **Save it to `C:\Users\ajith\restaurant-key.pem`**

> [!CAUTION]
> If you lose this `.pem` file you cannot SSH into your server. Store it safely.

### 7.4 — Configure Security Groups (Firewall Rules)

1. Under **Network settings** → Click **Edit**
2. Security group name: `restaurant-sg`
3. You'll see SSH rule already there. Add more rules:

Click **Add security group rule** for each:

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | My IP |
| HTTP | TCP | 80 | Anywhere (0.0.0.0/0) |
| Custom TCP *(Optional)* | TCP | 5000 | Anywhere (0.0.0.0/0) *(Only needed if testing without Nginx)* |

### 7.5 — Storage

- Leave at default: **8 GB gp3** (or increase to 20 GB for more space)

### 7.6 — Launch

Click **Launch instance** (orange button)

1. Click **View all instances**
2. Wait for **Instance state** to change from `Pending` → `Running`
3. Click on your instance → Copy the **Public IPv4 address**
   - Example: `54.123.45.67`
   - **Save this IP in Notepad**

---

## STEP 8 — Create RDS MySQL Database

> **Why?** RDS stores orders, users, foods, coupons — the primary database.

### 8.1 — Open RDS

1. Search **RDS** in top bar → Click **RDS**
2. Click **Create database**

### 8.2 — Engine Settings

| Field | Value |
|-------|-------|
| Creation method | **Standard create** |
| Engine type | **MySQL** |
| Engine version | **MySQL 8.0.40** (or latest 8.0.x) |
| Template | **Free tier** |

### 8.3 — Settings

| Field | Value |
|-------|-------|
| DB instance identifier | `restaurant-db` |
| Master username | `admin` |
| Credentials management | **Self managed** |
| Master password | `Restaurant@123` *(or your own — save it!)* |
| Confirm password | same as above |

### 8.4 — Instance Configuration

- DB instance class: **db.t3.micro** (Free tier)

### 8.5 — Connectivity

| Field | Value |
|-------|-------|
| Compute resource | **Don't connect to an EC2 compute resource** |
| VPC | Default VPC |
| Public access | **Yes** |
| VPC security group | **Create new** |
| New VPC security group name | `restaurant-db-sg` |
| Availability Zone | No preference |

### 8.6 — Additional Configuration

1. Expand **Additional configuration** section
2. Initial database name: `restaurant_db`
3. Leave everything else at default

Click **Create database** → Wait ~5 minutes for status to become **Available**

### 8.7 — Get the Endpoint

1. Click on `restaurant-db` from the databases list
2. Under **Connectivity & security** tab
3. Copy the **Endpoint**:
   ```
   restaurant-db.abc123xyz.us-east-1.rds.amazonaws.com
   ```
4. **Save this in Notepad**

### 8.8 — Fix RDS Security Group

The RDS must allow connections from EC2:

1. In the RDS page → **Connectivity & security** tab
2. Click on the security group link (under **VPC security groups**)
3. Click the **Inbound rules** tab → **Edit inbound rules**
4. Click **Add rule**:

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| MySQL/Aurora | TCP | 3306 | `0.0.0.0/0` |

5. Click **Save rules**

---

## ═══════════════════════════════════
## PHASE 2 — EC2 SERVER SETUP (SSH)
## ═══════════════════════════════════

---

## STEP 9 — Connect to EC2 via SSH

Open **Windows PowerShell** (as normal user, not admin):

### 9.1 — Fix the .pem File Permissions

```powershell
# Remove inherited permissions and grant only yourself read access
icacls "C:\Users\ajith\restaurant-key.pem" /inheritance:r
icacls "C:\Users\ajith\restaurant-key.pem" /grant:r "$($env:USERNAME):(R)"
```

### 9.2 — SSH into EC2

```powershell
ssh -i "C:\Users\ajith\restaurant-key.pem" ec2-user@54.123.45.67
```

Replace `54.123.45.67` with your actual EC2 Public IPv4 address.

When prompted `Are you sure you want to continue connecting?` → type `yes` → Enter

You should now see a prompt like:
```
[ec2-user@ip-172-31-xx-xx ~]$
```

✅ You are now inside your EC2 server.

---

## STEP 10 — Install Node.js on EC2

Run these commands **one by one** inside the SSH session:

```bash
# Download and run NVM installer
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

```bash
# Activate NVM in current session
source ~/.bashrc
```

```bash
# Install Node.js version 20
nvm install 20
```

```bash
# Use Node.js 20 as default
nvm use 20
nvm alias default 20
```

```bash
# Verify installation
node -v
# Expected output: v20.x.x

npm -v
# Expected output: 10.x.x
```

```bash
# Install PM2 globally (keeps server running)
npm install -g pm2
```

---

## STEP 11 — Install Git and MySQL Client

```bash
sudo dnf install -y git mysql
```

Wait for installation to complete. Verify:

```bash
git --version
# Expected: git version 2.x.x

mysql --version
# Expected: mysql  Ver 8.x.x
```

---

## STEP 12 — Clone Your Repository

```bash
# Clone from GitHub
git clone https://github.com/ajithkumar31082004-bit/Restaurant-Order-System.git
```

```bash
# Go into the backend directory
cd Restaurant-Order-System/restaurant-order-system/backend
```

```bash
# Verify files are there
ls
# Expected: server.js  package.json  controllers/  routes/  aws/  ...
```

---

## STEP 13 — Install Node Dependencies

```bash
npm install
```

Wait for all packages to install. You should see something like:
```
added 287 packages in 45s
```

---

## STEP 14 — Create the .env File

```bash
nano .env
```

This opens the nano text editor. Type or paste the following (use your real values):

```env
# Server
PORT=5000
NODE_ENV=production

# MySQL — RDS
DB_HOST=restaurant-db.abc123xyz.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=Restaurant@123
DB_NAME=restaurant_db
DB_PORT=3306

# JWT
JWT_SECRET=FoodHub_Super_Secret_Key_32chars_Min
JWT_EXPIRES_IN=7d

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/restaurant-orders
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:restaurant-order-notifications
DYNAMODB_TABLE=RestaurantOrders
S3_BUCKET=restaurant-images-ajith

# Frontend URL (your EC2 public IP)
FRONTEND_URL=http://54.123.45.67:5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

> [!IMPORTANT]
> Replace every placeholder value with your actual values from Notepad (keys, URLs, ARNs, endpoint, IP).

**Save the file:**
- Press `Ctrl + O` → Enter (to save)
- Press `Ctrl + X` (to exit)

Verify it saved:
```bash
cat .env
# Should print all your environment variables
```

---

## STEP 15 — Set Up the MySQL Database

### 15.1 — Verify RDS Connection

```bash
mysql -h restaurant-db.abc123xyz.us-east-1.rds.amazonaws.com -u admin -p
```

Enter password: `Restaurant@123`

You should see:
```
Welcome to the MySQL monitor. Commands end with ; or \g.
mysql>
```

Type `exit` to quit.

### 15.2 — Create Tables

```bash
node scripts/setupDb.js
```

Expected output:
```
✅ Connected to MySQL
✅ Tables created successfully
```

### 15.3 — Create Admin User

```bash
node scripts/seedAdmin.js
```

Expected output:
```
✅ Admin user created: admin@restaurant.com
```

### 15.4 — Populate Food Menu

```bash
node scripts/populateMenu.js
```

Expected output:
```
✅ Menu populated successfully (210 items)
```

---

## STEP 16 — Start the Server with PM2

### 16.1 — Start the App

```bash
pm2 start server.js --name restaurant
```

Expected output:
```
[PM2] Starting server.js in fork_mode
[PM2] Done
┌────┬────────────┬─────────┬───┬──────┬────────┐
│ id │ name       │ status  │ … │ cpu  │ memory │
├────┼────────────┼─────────┼───┼──────┼────────┤
│ 0  │ restaurant │ online  │ … │ 0%   │ 40mb   │
└────┴────────────┴─────────┴───┴──────┴────────┘
```

### 16.2 — Check Logs (Verify No Errors)

```bash
pm2 logs restaurant --lines 30
```

Look for:
```
Server running on port 5000 [production]
MySQL connected successfully
```

If you see MySQL errors → double-check your DB_HOST and DB_PASSWORD in `.env`

### 16.3 — Enable Auto-Start on Reboot

```bash
# Save PM2 process list
pm2 save

# Setup startup script
pm2 startup
```

The `pm2 startup` command will output a line like:
```
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/home/ec2-user/.nvm/versions/node/v20.x.x/bin ...
```

**Copy that entire `sudo env PATH=...` command and run it.**

---

## STEP 16B — Install & Configure Nginx Reverse Proxy

Instead of accessing your Node.js application directly on port `5000` (which is insecure and requires adding port `:5000` in the URL), configure **Nginx** as a reverse proxy to route traffic from standard port `80` (HTTP) to your application.

### 16B.1 — Install Nginx
On your EC2 instance (Amazon Linux 2023):
```bash
sudo dnf install -y nginx
```
*(If you are using an older Amazon Linux 2 version, use `sudo amazon-linux-extras install nginx1 -y` or `sudo yum install nginx -y`)*

### 16B.2 — Create the FoodHub Nginx Config
Create a custom configuration file for your website:
```bash
sudo nano /etc/nginx/conf.d/foodhub.conf
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name _;

    # Reverse proxy requests to Node.js backend running on port 5000
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*(Save and exit nano: Press `Ctrl+O`, `Enter`, then `Ctrl+X`)*

### 16B.3 — Disable Default Server Block (If needed)
Amazon Linux default Nginx config includes a default server block that might conflict with our custom rule. Open `/etc/nginx/nginx.conf`:
```bash
sudo nano /etc/nginx/nginx.conf
```
Scroll down to the `server { ... }` block inside `http { ... }`, and comment out (add `#` at the beginning of each line) or delete that server block so Nginx uses our custom configuration in `/etc/nginx/conf.d/foodhub.conf`. 

It should look like this after commenting out:
```nginx
#    server {
#        listen       80;
#        listen       [::]:80;
#        server_name  _;
#        root         /usr/share/nginx/html;
#
#        # Load configuration files for the default server block.
#        include /etc/nginx/default.d/*.conf;
#
#        error_page 404 /404.html;
#        location = /404.html {
#        }
#
#        error_page 500 502 503 504 /50x.html;
#        location = /50x.html {
#        }
#    }
```
*(Save and exit nano: Press `Ctrl+O`, `Enter`, then `Ctrl+X`)*

### 16B.4 — Start and Enable Nginx
Start the Nginx service and configure it to run on system boot:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 16B.5 — Test Nginx Configuration
Verify there are no syntax errors in Nginx config:
```bash
sudo nginx -t
# Expected: nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## ═══════════════════════════════════
## PHASE 3 — VERIFY EVERYTHING WORKS
## ═══════════════════════════════════

---

## STEP 17 — Open the Website

Open your browser and visit:
```
http://54.123.45.67
```

Replace with your EC2 Public IP (you do not need the `:5000` port suffix anymore!).

**Checklist:**
- [ ] Homepage loads with food items
- [ ] Menu page shows categories and dishes
- [ ] Login page works

---

## STEP 18 — Log in as Admin

1. Go to `http://54.123.45.67/pages/login.html`
2. Email: `admin@restaurant.com`
3. Password: `Admin@123`
4. Should redirect to admin dashboard

---

## STEP 19 — Place a Test Order

1. Go to the **Menu** page
2. Add a few items to cart
3. Go to **Checkout**
4. Fill in fake details (name, phone, address)
5. Click **Place Order**
6. You should see **Order Successful** page with an Order ID

---

## STEP 20 — Verify the Full AWS Pipeline

### 20.1 — Check SQS (message was sent)

1. Go to **SQS → restaurant-orders**
2. Click **Send and receive messages** → **Poll for messages**
3. The message may already be consumed by Lambda (that's correct!)
4. Check **Monitoring** tab → you'll see "Number of Messages Sent" spike

### 20.2 — Check Lambda (was triggered)

1. Go to **Lambda → RestaurantOrderProcessor**
2. Click **Monitor** tab → **View CloudWatch logs**
3. Click the latest log stream
4. You should see:
   ```
   Lambda triggered with event: {...}
   Processing order: ORD-XXXXXX
   Order ORD-XXXXXX stored in DynamoDB successfully.
   ```

### 20.3 — Check DynamoDB (order stored)

1. Go to **DynamoDB → Tables → RestaurantOrders**
2. Click **Explore table items**
3. You should see your order with fields:
   - `OrderID`, `CustomerName`, `Status`, `PreparationTimeMinutes`, `EstimatedDeliveryTime`

### 20.4 — Check Email (SNS notification)

1. Check the email you subscribed in Step 4
2. You should receive an order confirmation email

✅ **If all 4 checks pass — your deployment is 100% complete!**

---

## ═══════════════════════════════════
## QUICK REFERENCE — All Values
## ═══════════════════════════════════

| Resource | Name |
|----------|------|
| IAM User | `restaurant-app-user` |
| SQS Queue | `restaurant-orders` |
| SQS DLQ | `restaurant-orders-dlq` |
| DynamoDB Table | `RestaurantOrders` |
| DynamoDB Partition Key | `OrderID` (String) |
| SNS Topic | `restaurant-order-notifications` |
| S3 Bucket | `restaurant-images-ajith` |
| Lambda Function | `RestaurantOrderProcessor` |
| Lambda Handler | `lambda_function.handler` |
| Lambda Runtime | Node.js 20.x |
| EC2 Instance | `restaurant-server` |
| EC2 Type | t2.micro |
| EC2 Port | `80` (HTTP via Nginx Proxy to Node 5000) |
| RDS Instance | `restaurant-db` |
| RDS Database | `restaurant_db` |
| RDS Username | `admin` |
| Admin Email | `admin@restaurant.com` |
| Admin Password | `Admin@123` |

---

## ⚠️ Troubleshooting — Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` on MySQL | RDS Security Group blocks port 3306 | Add inbound rule: MySQL TCP 3306 from 0.0.0.0/0 |
| `SQS send failed` | Wrong SQS URL or missing credentials | Check `SQS_QUEUE_URL` and `AWS_ACCESS_KEY_ID` in `.env` |
| `Lambda not triggering` | SQS trigger not added to Lambda | Go to Lambda → Configuration → Triggers → Add SQS |
| `DynamoDB access denied` | Lambda role missing DynamoDB permission | Add `AmazonDynamoDBFullAccess` to Lambda execution role |
| `Port 80/5000 refused` | EC2 Security Group missing HTTP port 80 rule or Nginx stopped | Add inbound HTTP 80 rule on EC2 or run `sudo systemctl start nginx` |
| `SSH permission denied` | .pem file wrong permissions | Run `icacls` command from Step 9.1 |
| `Images not loading` | S3 bucket policy missing | Add the public bucket policy from Step 5.5 |
| `pm2 restart after reboot failed` | Startup script not run | Run `pm2 startup` and execute the output command |
| `Cannot find module` | npm install not done | Run `npm install` in the backend folder |
| `SNS email not received` | Subscription not confirmed | Check email inbox and click the confirm link |
