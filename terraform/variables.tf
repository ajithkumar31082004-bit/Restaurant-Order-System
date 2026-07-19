# ── Variables ──────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
}

variable "key_pair_name" {
  description = "Name of the EC2 key pair for SSH access (must already exist in AWS)"
  type        = string
  default     = "restaurant-key"
}

variable "admin_ip_cidr" {
  description = "Your IP address in CIDR notation for SSH access (e.g. 1.2.3.4/32)"
  type        = string
  default     = "0.0.0.0/0"   # Restrict this to your IP in production!
}

variable "db_password" {
  description = "Master password for RDS MySQL database"
  type        = string
  sensitive   = true           # Never printed in logs
}

variable "db_username" {
  description = "Master username for RDS MySQL database"
  type        = string
  default     = "admin"
}

variable "notification_email" {
  description = "Email address to subscribe to SNS order notifications"
  type        = string
}

variable "s3_bucket_name" {
  description = "Globally unique name for the S3 food images bucket"
  type        = string
  default     = "restaurant-images-foodhub"
}

variable "lambda_zip_path" {
  description = "Local path to the Lambda function ZIP file"
  type        = string
  default     = "../restaurant-order-system/backend/aws/lambda/lambda.zip"
}
