import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// AWS S3 Configuration
const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

// Create S3 client
const s3Client = new S3Client(awsConfig);

// S3 Bucket configuration
const S3_CONFIG = {
    bucketName: process.env.S3_BUCKET_NAME,
    region: process.env.AWS_REGION || 'us-east-1',
    signedUrlExpiration: 12 * 60 * 60, // 12 hour in seconds
    uploadUrlExpiration: 12 * 60 * 60
};

export { s3Client, S3_CONFIG }; 