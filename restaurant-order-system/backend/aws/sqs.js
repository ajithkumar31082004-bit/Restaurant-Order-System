const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const config = require('../config/config');

const awsCredentials = config.aws.accessKeyId && config.aws.secretAccessKey
  ? {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey
    }
  : undefined;

const sqsClient = new SQSClient({
  region: config.aws.region,
  credentials: awsCredentials
});

const snsClient = new SNSClient({
  region: config.aws.region,
  credentials: awsCredentials
});

/**
 * Send order payload to Amazon SQS for async processing
 */
async function sendOrderToSQS(orderPayload) {
  if (!config.aws.sqsQueueUrl) {
    console.warn('SQS_QUEUE_URL not configured - skipping SQS send');
    return { MessageId: 'local-dev-mock-id', mock: true };
  }

  const command = new SendMessageCommand({
    QueueUrl: config.aws.sqsQueueUrl,
    MessageBody: JSON.stringify(orderPayload),
    MessageAttributes: {
      OrderId: {
        DataType: 'String',
        StringValue: orderPayload.orderId
      },
      Source: {
        DataType: 'String',
        StringValue: 'restaurant-api'
      }
    }
  });

  const response = await sqsClient.send(command);
  console.log(`Order ${orderPayload.orderId} sent to SQS: ${response.MessageId}`);
  return response;
}

/**
 * Send order confirmation via Amazon SNS (Email/SMS)
 */
async function sendOrderNotification(order, type = 'email') {
  if (!config.aws.snsTopicArn) {
    console.warn('SNS_TOPIC_ARN not configured - skipping notification');
    return { MessageId: 'local-dev-mock-id', mock: true };
  }

  const orderId = order.orderId || order.order_id;
  const customerName = order.name || order.customer_name || 'Valued Customer';
  const total = order.total || order.total_amount;
  const items = order.items || [];

  let itemsText = '';
  items.forEach((item, index) => {
    const qty = item.qty || item.quantity || 1;
    const price = item.price || item.unit_price || 0;
    const name = item.name || item.food_name || 'Item';
    itemsText += `  ${index + 1}. ${name} x ${qty} — ₹${(qty * price).toFixed(2)}\n`;
  });

  const formattedMessage = `
🍔 FoodHub Order Confirmation 🍔
=========================================
Hello ${customerName},

Thank you for your order! We are preparing your meal with care.

📄 Order Details:
-----------------------------------------
Order ID : ${orderId}
Status   : Pending
Date     : ${new Date().toLocaleString('en-IN')}

🛒 Items Ordered:
-----------------------------------------
${itemsText}
-----------------------------------------
TOTAL AMOUNT: ₹${parseFloat(total).toFixed(2)}

⚡ Interactive Actions:
=========================================
🔗 Track Your Order Live:
   http://ec2-15-206-72-158.ap-south-1.compute.amazonaws.com/pages/track-order.html?orderId=${orderId}

📥 Download Tax Invoice (PDF):
   http://ec2-15-206-72-158.ap-south-1.compute.amazonaws.com/api/orders/${orderId}/invoice

=========================================
We hope you enjoy your meal!
If you have any questions, contact us at:
📞 Phone  : +91 98765 43210
📧 Email  : support@foodhub.com
`;

  const command = new PublishCommand({
    TopicArn: config.aws.snsTopicArn,
    Message: formattedMessage,
    Subject: `Order Confirmation - ${orderId}`,
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: type
      }
    }
  });

  const response = await snsClient.send(command);
  console.log(`Notification sent for order ${orderId}: ${response.MessageId}`);
  return response;
}

module.exports = {
  sqsClient,
  snsClient,
  sendOrderToSQS,
  sendOrderNotification
};
