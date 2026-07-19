# ── RDS Subnet Group ───────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "restaurant_db_subnet" {
  name       = "restaurant-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "restaurant-db-subnet-group"
  }
}

# ── RDS Security Group ─────────────────────────────────────────────────────────

resource "aws_security_group" "rds_sg" {
  name        = "restaurant-db-sg"
  description = "Security group for FoodHub RDS MySQL"
  vpc_id      = data.aws_vpc.default.id

  # Allow MySQL connections from the EC2 security group
  ingress {
    description     = "MySQL from EC2"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "restaurant-db-sg"
  }
}

# ── RDS MySQL Instance ─────────────────────────────────────────────────────────

resource "aws_db_instance" "restaurant_db" {
  identifier = "restaurant-db"

  # Engine
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"   # Free tier eligible

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100      # Auto-scaling enabled
  storage_type          = "gp2"
  storage_encrypted     = true

  # Credentials
  db_name  = "restaurant_db"
  username = var.db_username
  password = var.db_password

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.restaurant_db_subnet.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false   # Only accessible from EC2

  # Backup & maintenance
  backup_retention_period = 7           # 7 days of automatic backups
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  deletion_protection     = false       # Set to true in production!
  skip_final_snapshot     = true        # Set to false in production!

  # Monitoring
  monitoring_interval = 60             # Enhanced monitoring every 60s
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "restaurant-db"
  }
}

# ── IAM Role for RDS Enhanced Monitoring ─────────────────────────────────────

resource "aws_iam_role" "rds_monitoring" {
  name = "restaurant-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_attach" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
