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

  const message = {
    orderId: order.orderId,
    customerName: order.name || order.customer_name,
    phone: order.phone || order.customer_phone,
    email: order.email || order.customer_email,
    total: order.total || order.total_amount,
    status: order.status || order.order_status,
    items: order.items,
    notificationType: type,
    timestamp: new Date().toISOString()
  };

  const command = new PublishCommand({
    TopicArn: config.aws.snsTopicArn,
    Message: JSON.stringify(message),
    Subject: `Order Confirmation - ${order.orderId}`,
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: type
      }
    }
  });

  const response = await snsClient.send(command);
  console.log(`Notification sent for order ${order.orderId}: ${response.MessageId}`);
  return response;
}

module.exports = {
  sqsClient,
  snsClient,
  sendOrderToSQS,
  sendOrderNotification
};
