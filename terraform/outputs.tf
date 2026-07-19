# ── Outputs ────────────────────────────────────────────────────────────────────
# These values are printed after `terraform apply` completes.
# Copy them into your .env file on EC2.

output "ec2_public_ip" {
  description = "Public IP of the EC2 web server (use this for SSH and browser)"
  value       = aws_eip.restaurant_eip.public_ip
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.restaurant_server.id
}

output "rds_endpoint" {
  description = "RDS MySQL endpoint → set as DB_HOST in .env"
  value       = aws_db_instance.restaurant_db.endpoint
  sensitive   = true
}

output "sqs_queue_url" {
  description = "SQS Queue URL → set as SQS_QUEUE_URL in .env"
  value       = aws_sqs_queue.orders.url
}

output "sqs_dlq_url" {
  description = "SQS Dead Letter Queue URL"
  value       = aws_sqs_queue.orders_dlq.url
}

output "dynamodb_table_name" {
  description = "DynamoDB table name → set as DYNAMODB_TABLE in .env"
  value       = aws_dynamodb_table.restaurant_orders.name
}

output "sns_topic_arn" {
  description = "SNS Topic ARN → set as SNS_TOPIC_ARN in .env"
  value       = aws_sns_topic.order_notifications.arn
}

output "s3_bucket_name" {
  description = "S3 bucket name → set as S3_BUCKET in .env"
  value       = aws_s3_bucket.food_images.id
}

output "s3_bucket_url" {
  description = "S3 bucket base URL for accessing food images"
  value       = "https://${aws_s3_bucket.food_images.bucket_regional_domain_name}"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.order_processor.function_name
}

output "env_file_values" {
  description = "Copy-paste ready .env values for EC2"
  sensitive   = true
  value = <<-EOT
    # ── Paste these into your .env file on EC2 ──
    DB_HOST=${aws_db_instance.restaurant_db.address}
    DB_NAME=restaurant_db
    SQS_QUEUE_URL=${aws_sqs_queue.orders.url}
    SNS_TOPIC_ARN=${aws_sns_topic.order_notifications.arn}
    DYNAMODB_TABLE=${aws_dynamodb_table.restaurant_orders.name}
    S3_BUCKET=${aws_s3_bucket.food_images.id}
    FRONTEND_URL=http://${aws_eip.restaurant_eip.public_ip}
  EOT
}
