const { S3Client, CreateBucketCommand, PutBucketPolicyCommand, DeletePublicAccessBlockCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const region = process.env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const s3 = new S3Client({ region, credentials });

async function setupS3() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const bucketName = `restaurant-images-ajith-${suffix}`;
  
  console.log(`⏳ Creating globally unique S3 Bucket: "${bucketName}"...`);
  
  try {
    // 1. Create S3 Bucket
    await s3.send(new CreateBucketCommand({
      Bucket: bucketName
    }));
    console.log(`✅ S3 Bucket "${bucketName}" Created successfully!`);

    // 2. Disable "Block Public Access"
    console.log('⏳ Disabling Block Public Access...');
    await s3.send(new DeletePublicAccessBlockCommand({
      Bucket: bucketName
    }));
    console.log('✅ Block Public Access Disabled.');

    // 3. Add Public Read Bucket Policy
    console.log('⏳ Applying Public Read Policy...');
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/*`
        }
      ]
    };

    await s3.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));
    console.log('✅ Public Read Policy applied successfully.');

    // 4. Update .env
    const envPath = path.join(__dirname, '../.env');
    let content = fs.readFileSync(envPath, 'utf8');
    const regex = /^S3_BUCKET=.*$/m;
    if (regex.test(content)) {
      content = content.replace(regex, `S3_BUCKET=${bucketName}`);
    } else {
      content += `\nS3_BUCKET=${bucketName}`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`📝 Updated .env with: S3_BUCKET=${bucketName}`);

    return bucketName;
  } catch (err) {
    console.error(`❌ S3 Bucket configuration failed: ${err.message}`);
    throw err;
  }
}

setupS3();
