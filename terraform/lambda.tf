# ── IAM Role for Lambda ────────────────────────────────────────────────────────

resource "aws_iam_role" "lambda_role" {
  name = "restaurant-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "restaurant-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs (basic Lambda logging)
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      # SQS — read messages from queue
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.orders.arn
      },
      # DynamoDB — write enriched orders
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.restaurant_orders.arn
      },
      # SNS — publish customer notifications
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.order_notifications.arn
      }
    ]
  })
}

# ── CloudWatch Log Group for Lambda ───────────────────────────────────────────

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/RestaurantOrderProcessor"
  retention_in_days = 14

  tags = {
    Name = "restaurant-lambda-logs"
  }
}

# ── Lambda Function ────────────────────────────────────────────────────────────

resource "aws_lambda_function" "order_processor" {
  function_name = "RestaurantOrderProcessor"
  description   = "Processes restaurant orders from SQS, stores in DynamoDB, sends SNS notification"

  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  handler          = "lambda_function.handler"
  runtime          = "nodejs20.x"
  timeout          = 60    # 60 second timeout
  memory_size      = 256   # 256 MB

  role = aws_iam_role.lambda_role.arn

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.restaurant_orders.name
      SNS_TOPIC_ARN   = aws_sns_topic.order_notifications.arn
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_policy,
    aws_cloudwatch_log_group.lambda_logs
  ]

  tags = {
    Name = "RestaurantOrderProcessor"
  }
}

# ── SQS → Lambda Event Source Mapping ────────────────────────────────────────

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn
  batch_size       = 1       # Process one order at a time
  enabled          = true

  # Function response types — allow partial batch failure reporting
  function_response_types = ["ReportBatchItemFailures"]
}

# ── CloudWatch Alarms ──────────────────────────────────────────────────────────

# Alarm: Lambda errors in last 5 minutes
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "restaurant-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda order processor is erroring frequently"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.order_processor.function_name
  }

  alarm_actions = [aws_sns_topic.order_notifications.arn]
}

# Alarm: SQS DLQ has messages (orders failed processing)
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "restaurant-orders-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Dead letter queue has messages — orders failed to process"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }

  alarm_actions = [aws_sns_topic.order_notifications.arn]
}
