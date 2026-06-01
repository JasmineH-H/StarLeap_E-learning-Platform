import express from 'express';
import courseController from '../controllers/courseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { memoryUpload, s3Upload, handleUploadError, thumbnailUpload, quizImageUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();
router.get('/materials/:materialId/download', courseController.downloadMaterial);
router.put(
    '/quiz/:quizId/:questionId', 
    quizImageUpload.single('image'),
    handleUploadError,
    courseController.uploadQuizQuestionImage);
// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get('/materials-all', courseController.getAllMaterialsHandler);
// Course CRUD routes
router.post('/', courseController.createCourse);
router.get('/', courseController.getAllCourses);
router.get('/:courseId', courseController.getCourseById);
router.put('/:courseId', courseController.updateCourse);
router.delete('/:courseId', courseController.deleteCourse);

// Module management
router.put('/:courseId/modules', courseController.updateModules);

// Material management routes
router.post(
    '/:courseId/materials', 
    s3Upload.array('files', 20),
    handleUploadError,
    courseController.uploadMaterial
);

router.post(
    '/:courseId/modules/:moduleId/materials', 
    s3Upload.array('files', 20),
    handleUploadError,
    courseController.uploadMaterial
);

router.get('/materials/:materialId', courseController.getMaterial);


router.delete('/materials/:materialId', courseController.deleteMaterial);

// Get presigned URL for direct client uploads
router.post('/:courseId/upload-url', courseController.getUploadUrl);
router.post('/:courseId/modules/:moduleId/upload-url', courseController.getUploadUrl);

// Add these thumbnail routes:
router.post(
    '/:courseId/thumbnail',
    thumbnailUpload.single('thumbnail'),
    handleUploadError,
    courseController.uploadThumbnail
);

router.get('/:courseId/thumbnail', courseController.getThumbnail);
router.delete('/:courseId/thumbnail', courseController.deleteThumbnail);
router.get('/:courseId/thumbnail-download', courseController.downloadThumbnail);
export default router; 