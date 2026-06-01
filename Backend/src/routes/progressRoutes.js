import express from 'express';
import progressController from '../controllers/progressController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require auth
router.use(authenticateToken);

// Student: get own progress
router.get('/course/:courseId', requireRole(['student', 'instructor']), progressController.getOwnProgress);

// Instructor: get all students progress for a course
router.get('/course/:courseId/all', requireRole(['instructor']), progressController.getCourseProgress);

export default router; 