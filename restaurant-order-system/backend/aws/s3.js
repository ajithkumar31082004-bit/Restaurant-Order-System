const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config/config');

const awsCredentials =
  config.aws.accessKeyId && config.aws.secretAccessKey
    ? { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey }
    : undefined;

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: awsCredentials
});

const BUCKET = config.aws.s3Bucket;

/**
 * Upload a Buffer to S3.
 * @param {Buffer}  buffer     – PDF or image data
 * @param {string}  key        – S3 object key  (e.g. "invoices/ORD123.pdf")
 * @param {string}  contentType – MIME type
 * @returns {Promise<{url: string, key: string}>}
 */
async function uploadToS3(buffer, key, contentType = 'application/pdf') {
  if (!BUCKET) {
    throw new Error('S3_BUCKET env variable is not configured');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
    // NOTE: No ACL — relies on bucket policy for access control
  });

  await s3Client.send(command);
  console.log(`Uploaded to S3: s3://${BUCKET}/${key}`);

  return {
    key,
    bucket: BUCKET,
    region: config.aws.region
  };
}

/**
 * Generate a short-lived pre-signed GET URL for an S3 object.
 * @param {string}  key           – S3 object key
 * @param {number}  expiresInSec  – default 1 hour (3600 s)
 * @returns {Promise<string>} signed URL
 */
async function getPresignedUrl(key, expiresInSec = 3600) {
  if (!BUCKET) throw new Error('S3_BUCKET not configured');

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSec });
}

/**
 * Check if an object already exists in S3 (avoid regenerating the same invoice).
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function objectExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

module.exports = { uploadToS3, getPresignedUrl, objectExists, s3Client };
