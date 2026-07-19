terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store state in S3 (recommended — prevents drift)
  # Uncomment and configure after creating the S3 bucket manually:
  # backend "s3" {
  #   bucket = "foodhub-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = var.aws_region
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "FoodHub"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Data Sources ───────────────────────────────────────────────────────────────

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_availability_zones" "available" {}

# ── VPC & Networking (Default VPC) ────────────────────────────────────────────

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Security Group — EC2 (Web Server) ─────────────────────────────────────────

resource "aws_security_group" "ec2_sg" {
  name        = "restaurant-sg"
  description = "Security group for FoodHub EC2 web server"
  vpc_id      = data.aws_vpc.default.id

  # SSH — restrict to your IP in production
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS (for future SSL)
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "restaurant-sg"
  }
}

# ── IAM Role for EC2 ──────────────────────────────────────────────────────────

resource "aws_iam_role" "ec2_role" {
  name = "restaurant-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_policy" {
  name = "restaurant-ec2-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.orders.arn
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.order_notifications.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.restaurant_orders.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.food_images.arn,
          "${aws_s3_bucket.food_images.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "restaurant-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ── EC2 Instance ───────────────────────────────────────────────────────────────

resource "aws_instance" "restaurant_server" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t2.micro"   # Free tier eligible
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  # User data: bootstrap script runs once on first launch
  user_data = base64encode(templatefile("${path.module}/scripts/ec2_bootstrap.sh", {
    repo_url    = "https://github.com/ajithkumar31082004-bit/Restaurant-Order-System.git"
    node_version = "20"
  }))

  tags = {
    Name = "restaurant-server"
  }
}

# ── Elastic IP (static IP for EC2) ───────────────────────────────────────────

resource "aws_eip" "restaurant_eip" {
  instance = aws_instance.restaurant_server.id
  domain   = "vpc"

  tags = {
    Name = "restaurant-eip"
  }
}
