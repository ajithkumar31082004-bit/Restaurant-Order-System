# ═══════════════════════════════════════════════════════════════════════════════
#  AWS Services — SQS, DynamoDB, SNS, S3
# ═══════════════════════════════════════════════════════════════════════════════

# ── SQS — Dead Letter Queue (must be created before main queue) ───────────────

resource "aws_sqs_queue" "orders_dlq" {
  name                       = "restaurant-orders-dlq"
  message_retention_seconds  = 1209600   # 14 days
  visibility_timeout_seconds = 30

  tags = {
    Name    = "restaurant-orders-dlq"
    Purpose = "Dead letter queue for failed order messages"
  }
}

# ── SQS — Main Orders Queue ────────────────────────────────────────────────────

resource "aws_sqs_queue" "orders" {
  name                       = "restaurant-orders"
  delay_seconds              = 0
  max_message_size           = 262144    # 256 KB
  message_retention_seconds  = 86400     # 1 day
  receive_wait_time_seconds  = 20        # Long polling (reduces API calls)
  visibility_timeout_seconds = 300       # 5 min (allows Lambda time to process)

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3              # Retry 3 times before moving to DLQ
  })

  tags = {
    Name    = "restaurant-orders"
    Purpose = "Async order processing queue"
  }
}

# ── DynamoDB — Order Analytics Table ──────────────────────────────────────────

resource "aws_dynamodb_table" "restaurant_orders" {
  name         = "RestaurantOrders"
  billing_mode = "PAY_PER_REQUEST"   # On-demand (no fixed cost)
  hash_key     = "OrderID"

  attribute {
    name = "OrderID"
    type = "S"
  }

  # Global Secondary Index for querying orders by customer
  global_secondary_index {
    name            = "CustomerID-index"
    hash_key        = "CustomerID"
    projection_type = "ALL"
  }

  attribute {
    name = "CustomerID"
    type = "S"
  }

  # Enable point-in-time recovery (backup)
  point_in_time_recovery {
    enabled = true
  }

  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }

  # TTL — automatically delete records older than 1 year
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  tags = {
    Name    = "RestaurantOrders"
    Purpose = "Enriched order analytics from Lambda"
  }
}

# ── SNS — Order Notifications Topic ───────────────────────────────────────────

resource "aws_sns_topic" "order_notifications" {
  name         = "restaurant-order-notifications"
  display_name = "FoodHub Orders"

  tags = {
    Name    = "restaurant-order-notifications"
    Purpose = "Customer email/SMS order confirmations"
  }
}

# ── SNS — Email Subscription ──────────────────────────────────────────────────

resource "aws_sns_topic_subscription" "email_sub" {
  topic_arn = aws_sns_topic.order_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# ── S3 — Food Images Bucket ───────────────────────────────────────────────────

resource "aws_s3_bucket" "food_images" {
  bucket        = var.s3_bucket_name
  force_destroy = false    # Protect from accidental deletion

  tags = {
    Name    = var.s3_bucket_name
    Purpose = "Food menu image storage"
  }
}

resource "aws_s3_bucket_versioning" "food_images_versioning" {
  bucket = aws_s3_bucket.food_images.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "food_images_encryption" {
  bucket = aws_s3_bucket.food_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Allow public GET access for food images (menu display)
resource "aws_s3_bucket_public_access_block" "food_images_public" {
  bucket                  = aws_s3_bucket.food_images.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "food_images_public_read" {
  bucket     = aws_s3_bucket.food_images.id
  depends_on = [aws_s3_bucket_public_access_block.food_images_public]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.food_images.arn}/*"
      }
    ]
  })
}

# CORS for frontend direct uploads
resource "aws_s3_bucket_cors_configuration" "food_images_cors" {
  bucket = aws_s3_bucket.food_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}
