const { SNSClient, SubscribeCommand } = require('@aws-sdk/client-sns');
require('dotenv').config();

const region = process.env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const sns = new SNSClient({ region, credentials });

async function subscribe(email) {
  if (!email || !email.includes('@')) {
    console.error('❌ Error: Please enter a valid email address!');
    process.exit(1);
  }

  console.log(`⏳ Creating Email Subscription for ${email}...`);
  try {
    const res = await sns.send(new SubscribeCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Protocol: 'email',
      Endpoint: email
    }));
    console.log('\n✅ Subscription Created!');
    console.log(`✉️ Check the inbox of ${email} and click "Confirm Subscription" from AWS SNS.`);
  } catch (err) {
    console.error(`❌ SNS Subscription failed: ${err.message}`);
  }
  process.exit(0);
}

const emailArg = process.argv[2];
if (!emailArg) {
  console.log('ℹ️ Usage: node scripts/subscribeEmail.js your-email@gmail.com');
  process.exit(1);
}

subscribe(emailArg);
