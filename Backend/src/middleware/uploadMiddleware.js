import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Allowed file types for course materials
const ALLOWED_FILE_TYPES = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    document: 10 * 1024 * 1024,  // 10MB for documents
    image: 10 * 1024 * 1024,      // 10MB for images  
    default: 10 * 1024 * 1024    // 10MB default
};

// File type validator
const fileFilter = (req, file, cb) => {
    const isAllowed = ALLOWED_FILE_TYPES[file.mimetype];
    
    if (isAllowed) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}`), false);
    }
};

// Local disk storage configuration (dev-friendly)
const BASE_UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure base uploads directory exists
if (!fs.existsSync(BASE_UPLOADS_DIR)) {
    fs.mkdirSync(BASE_UPLOADS_DIR, { recursive: true });
}

// Memory storage for cases where you want to process before saving (kept for parity)
const memoryStorage = multer.memoryStorage();

// Disk storage for materials (replaces S3 storage for local development)
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { courseId, moduleId } = req.params || {};
        // Build a sensible folder structure under uploads/
        let dest = path.join(BASE_UPLOADS_DIR, 'courses');
        if (courseId) dest = path.join(dest, String(courseId));
        if (moduleId) dest = path.join(dest, 'modules', String(moduleId));

        // Ensure destination exists
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        const filename = `${uuidv4()}${ext}`;
        // Store relative saved path on the request so other middleware/controllers can use it
        req.savedFilePath = path.join('uploads', 'courses', req.params.courseId || '', req.params.moduleId ? path.join('modules', String(req.params.moduleId), filename) : filename);
        cb(null, filename);
    }
});

// Create upload middleware using diskStorage (keeps the old name `s3Upload` as a drop-in)
const s3Upload = multer({
    storage: diskStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: FILE_SIZE_LIMITS.default,
        files: 20 // Maximum 20 files per request
    }
});

// Create upload middleware with memory storage (for custom processing)
const memoryUpload = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: FILE_SIZE_LIMITS.default,
        files: 20
    }
});

// Add thumbnail-specific file filter
const thumbnailFilter = (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Thumbnail must be a PNG or JPEG image'), false);
    }
};

// Create thumbnail upload middleware (save to uploads/thumbnails)
const thumbnailStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(BASE_UPLOADS_DIR, 'thumbnails');
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        const filename = `${uuidv4()}${ext}`;
        // expose saved path for controllers
        req.savedFilePath = path.join('uploads', 'thumbnails', filename);
        cb(null, filename);
    }
});

const thumbnailUpload = multer({
    storage: thumbnailStorage,
    fileFilter: thumbnailFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB for thumbnails
        files: 1 // Only 1 thumbnail per course
    }
});

const quizImageFilter = (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Quiz image must be a PNG, JPEG, JPG, or GIF image'), false);
    }
};

const quizImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(BASE_UPLOADS_DIR, 'quiz-images');
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        const filename = `${uuidv4()}${ext}`;
        // expose saved path for controllers
        req.savedFilePath = path.join('uploads', 'quiz-images', filename);
        cb(null, filename);
    }
});
const quizImageUpload = multer({
    storage: quizImageStorage,
    fileFilter: quizImageFilter,
    limits: {
        fileSize: FILE_SIZE_LIMITS.default,
        files: 1
    }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large',
                error: error.message
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files',
                error: error.message
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name',
                error: error.message
            });
        }
    }
    
    if (error.message.includes('File type')) {
        return res.status(400).json({
            success: false,
            message: 'Invalid file type',
            error: error.message
        });
    }
    
    return res.status(500).json({
        success: false,
        message: 'File upload error',
        error: error.message
    });
};

export {
    s3Upload,
    memoryUpload,
    thumbnailUpload,
    quizImageUpload,
    handleUploadError,
    ALLOWED_FILE_TYPES,
    FILE_SIZE_LIMITS
}; 