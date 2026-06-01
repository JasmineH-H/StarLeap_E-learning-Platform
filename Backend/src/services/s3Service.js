import { 
    PutObjectCommand, 
    GetObjectCommand, 
    DeleteObjectCommand, 
    HeadObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/aws.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class S3Service {
    
    /**
     * Upload file to S3 bucket
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} fileName - Original file name
     * @param {string} mimeType - File MIME type
     * @param {string} courseId - Course ID for organizing files
     * @param {string} moduleId - Module ID for organizing files
     * @returns {Object} Upload result with key and URL
     */
    async uploadFile(fileBuffer, fileName, mimeType, courseId, moduleId = null) {
        try {
            // Generate unique file key
            fileName = fileName.replace(/[^\x00-\x7F]/g, "").replace(/[^a-zA-Z0-9.-]/g, "_").trim();
            const fileExtension = path.extname(fileName);
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            
            // Create folder structure: courses/{courseId}/modules/{moduleId}/{file}
            let key = `courses/${courseId}/`;
            if (moduleId) {
                key += `modules/${moduleId}/`;
            }
            key += uniqueFileName;

            const uploadParams = {
                Bucket: S3_CONFIG.bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
                ServerSideEncryption: 'AES256',
                Metadata: {
                    originalName: fileName,
                    courseId: courseId,
                    moduleId: moduleId || '',
                    uploadedAt: new Date().toISOString()
                }
            };

            const command = new PutObjectCommand(uploadParams);
            await s3Client.send(command);

            // Generate public URL
            const publicUrl = `https://${S3_CONFIG.bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`;

            return {
                success: true,
                key: key,
                url: publicUrl,
                originalName: fileName,
                size: fileBuffer.length,
                mimeType: mimeType
            };

        } catch (error) {
            console.error('S3 Upload Error:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    /**
     * Generate signed URL for secure file access
     * @param {string} key - S3 object key
     * @param {number} expiresIn - URL expiration time in seconds
     * @returns {string} Signed URL
     */
    async getSignedUrl(key, expiresIn = S3_CONFIG.signedUrlExpiration) {
        try {
            const command = new GetObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: key,
            });

            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
            return signedUrl;

        } catch (error) {
            console.error('S3 Signed URL Error:', error);
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }

    /**
     * Delete file from S3 bucket
     * @param {string} key - S3 object key
     * @returns {boolean} Success status
     */
    async deleteFile(key) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: key,
            });

            await s3Client.send(command);
            return true;

        } catch (error) {
            console.error('S3 Delete Error:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * Check if file exists in S3
     * @param {string} key - S3 object key
     * @returns {boolean} File existence status
     */
    async fileExists(key) {
        try {
            const command = new HeadObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: key,
            });

            await s3Client.send(command);
            return true;

        } catch (error) {
            if (error.name === 'NotFound') {
                return false;
            }
            console.error('S3 File Check Error:', error);
            throw new Error(`Failed to check file existence: ${error.message}`);
        }
    }

    /**
     * Get file metadata from S3
     * @param {string} key - S3 object key
     * @returns {Object} File metadata
     */
    async getFileMetadata(key) {
        try {
            const command = new HeadObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: key,
            });

            const response = await s3Client.send(command);
            
            return {
                size: response.ContentLength,
                lastModified: response.LastModified,
                contentType: response.ContentType,
                metadata: response.Metadata || {}
            };

        } catch (error) {
            console.error('S3 Metadata Error:', error);
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }

    /**
     * Generate upload presigned URL for direct client uploads
     * @param {string} fileName - File name
     * @param {string} mimeType - File MIME type
     * @param {string} courseId - Course ID
     * @param {string} moduleId - Module ID
     * @returns {Object} Presigned URL and key
     */
    async getUploadPresignedUrl(fileName, mimeType, courseId, moduleId = null) {
        try {
            const fileExtension = path.extname(fileName);
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            
            let key = `courses/${courseId}/`;
            if (moduleId) {
                key += `modules/${moduleId}/`;
            }
            key += uniqueFileName;

            const command = new PutObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: key,
                ContentType: mimeType,
                ServerSideEncryption: 'AES256',
                Metadata: {
                    originalName: fileName,
                    courseId: courseId,
                    moduleId: moduleId || '',
                }
            });

            const signedUrl = await getSignedUrl(s3Client, command, { 
                expiresIn: S3_CONFIG.uploadUrlExpiration
            });

            return {
                uploadUrl: signedUrl,
                key: key,
                publicUrl: `https://${S3_CONFIG.bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`
            };

        } catch (error) {
            console.error('S3 Upload Presigned URL Error:', error);
            throw new Error(`Failed to generate upload URL: ${error.message}`);
        }
    }
}

export default new S3Service(); 