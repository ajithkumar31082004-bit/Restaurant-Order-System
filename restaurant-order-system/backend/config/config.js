require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_db',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sqsQueueUrl: process.env.SQS_QUEUE_URL,
    snsTopicArn: process.env.SNS_TOPIC_ARN,
    dynamoDbTable: process.env.DYNAMODB_TABLE || 'RestaurantOrders',
    s3Bucket: process.env.S3_BUCKET
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  gstRate: 0.05,
  deliveryCharge: 40,
  freeDeliveryMin: 400
};
