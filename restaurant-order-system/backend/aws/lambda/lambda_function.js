/**
 * AWS Lambda Function - Process Restaurant Orders from SQS
 * Trigger: SQS Queue (restaurant-orders)
 * Actions: Validate, enrich, store in DynamoDB, CloudWatch logging (EMF metrics)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'RestaurantOrders';

// Helper to log structured CloudWatch EMF (Embedded Metric Format)
function logEMFMetric(name, value, unit = 'Count') {
  console.log(JSON.stringify({
    '_aws': {
      'Timestamp': Date.now(),
      'CloudWatchMetrics': [
        {
          'Namespace': 'FoodHub/OrderProcessing',
          'Dimensions': [['Service']],
          'Metrics': [
            { 'Name': name, 'Unit': unit }
          ]
        }
      ]
    },
    'Service': 'LambdaOrderProcessor',
    [name]: value
  }));
}

exports.handler = async (event) => {
  console.log('Lambda triggered with event:', JSON.stringify(event));

  const results = [];
  let successfulOrders = 0;
  let totalRevenue = 0;

  for (const record of event.Records) {
    try {
      const order = JSON.parse(record.body);
      console.log(`Processing order: ${order.orderId}`);

      if (!order.orderId || !order.name || !order.items || !order.total) {
        throw new Error(`Invalid order payload: ${record.messageId}`);
      }

      // Calculate preparation duration estimate based on items count
      const itemsCount = order.items.reduce((sum, i) => sum + (i.qty || 1), 0);
      const estPrepMinutes = Math.min(60, 20 + (itemsCount * 2)); // base 20m + 2m per item

      // Enrich the order payload
      const enrichedOrder = {
        OrderID: order.orderId,
        CustomerName: order.name,
        Phone: order.phone,
        Email: order.email || 'N/A',
        Address: order.address,
        Items: order.items,
        Total: order.total,
        Payment: order.payment || 'COD',
        Status: order.status || 'Pending',
        UserId: order.userId || null,
        Timestamp: order.createdAt || new Date().toISOString(),
        ProcessedAt: new Date().toISOString(),
        Source: 'SQS-Lambda',
        PreparationTimeMinutes: estPrepMinutes,
        RiderAssigned: 'Pending Rider Assignment',
        EstimatedDeliveryTime: new Date(Date.now() + (estPrepMinutes + 15) * 60000).toISOString() // Prep + 15m travel
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: enrichedOrder,
        ConditionExpression: 'attribute_not_exists(OrderID)'
      }));

      console.log(`Order ${order.orderId} stored in DynamoDB successfully.`);
      
      successfulOrders++;
      totalRevenue += parseFloat(order.total) || 0;
      
      results.push({ orderId: order.orderId, status: 'success' });
    } catch (error) {
      console.error(`Failed to process record ${record.messageId}:`, error.message);

      if (error.name === 'ConditionalCheckFailedException') {
        console.warn(`Order already exists in DynamoDB - skipping duplicate`);
        results.push({ messageId: record.messageId, status: 'duplicate' });
      } else {
        // Increment processing error metric
        logEMFMetric('ProcessingErrors', 1, 'Count');
        
        // Re-throw so SQS triggers retry or moves to DLQ
        throw error;
      }
    }
  }

  // Publish metrics to CloudWatch logs (EMF format)
  if (successfulOrders > 0) {
    logEMFMetric('ProcessedOrders', successfulOrders, 'Count');
    logEMFMetric('ProcessedRevenue', totalRevenue, 'None');
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Orders processed successfully',
      processedCount: successfulOrders,
      results
    })
  };
};
