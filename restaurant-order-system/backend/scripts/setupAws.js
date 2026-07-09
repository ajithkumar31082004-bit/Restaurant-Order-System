const { SQSClient, CreateQueueCommand } = require('@aws-sdk/client-sqs');
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
const { SNSClient, CreateTopicCommand } = require('@aws-sdk/client-sns');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const region = process.env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

if (!credentials.accessKeyId || !credentials.secretAccessKey) {
  console.error('❌ Error: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is missing in your .env file!');
  process.exit(1);
}

const sqs = new SQSClient({ region, credentials });
const ddb = new DynamoDBClient({ region, credentials });
const sns = new SNSClient({ region, credentials });

async function setupSQS() {
  console.log('⏳ Creating SQS Queue "restaurant-orders"...');
  try {
    const res = await sqs.send(new CreateQueueCommand({
      QueueName: 'restaurant-orders'
    }));
    console.log(`✅ SQS Queue Created! URL: ${res.QueueUrl}`);
    return res.QueueUrl;
  } catch (err) {
    if (err.name === 'QueueNameExists' || err.message.includes('QueueAlreadyExists')) {
      // Get URL if already exists
      const queueUrl = `https://sqs.${region}.amazonaws.com/${err.message.split(' ').pop() || '123456789012'}/restaurant-orders`;
      console.log(`ℹ️ SQS Queue already exists: ${queueUrl}`);
      return queueUrl;
    }
    console.error(`❌ SQS Creation failed: ${err.message}`);
    throw err;
  }
}

async function setupDynamoDB() {
  console.log('⏳ Creating DynamoDB Table "RestaurantOrders"...');
  try {
    await ddb.send(new CreateTableCommand({
      TableName: 'RestaurantOrders',
      KeySchema: [
        { AttributeName: 'OrderID', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'OrderID', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    }));
    console.log('✅ DynamoDB Table Created successfully!');
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log('ℹ️ DynamoDB Table "RestaurantOrders" already exists.');
    } else {
      console.error(`❌ DynamoDB Creation failed: ${err.message}`);
      throw err;
    }
  }
  return 'RestaurantOrders';
}

async function setupSNS() {
  console.log('⏳ Creating SNS Topic "restaurant-order-notifications"...');
  try {
    const res = await sns.send(new CreateTopicCommand({
      Name: 'restaurant-order-notifications'
    }));
    console.log(`✅ SNS Topic Created! ARN: ${res.TopicArn}`);
    return res.TopicArn;
  } catch (err) {
    console.error(`❌ SNS Creation failed: ${err.message}`);
    throw err;
  }
}

function updateEnv(updates) {
  const envPath = path.join(__dirname, '../.env');
  let content = fs.readFileSync(envPath, 'utf8');
  
  Object.entries(updates).forEach(([key, val]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  });
  
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('📝 Updated .env file with new AWS resource endpoints.');
}

async function main() {
  console.log('==================================================');
  console.log('     PROVISIONING AWS CLOUD INFRASTRUCTURE        ');
  console.log('==================================================\n');
  
  try {
    const sqsUrl = await setupSQS();
    const ddbTable = await setupDynamoDB();
    const snsArn = await setupSNS();
    
    console.log('\n✍️ Writing settings to .env file...');
    updateEnv({
      SQS_QUEUE_URL: sqsUrl,
      DYNAMODB_TABLE: ddbTable,
      SNS_TOPIC_ARN: snsArn
    });
    
    console.log('\n🎉 AWS Resources are set up successfully!');
  } catch (err) {
    console.error(`\n❌ Setup aborted due to error: ${err.message}`);
  }
}

main();
