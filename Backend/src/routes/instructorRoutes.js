import express from 'express';
import instructorController from '../controllers/instructorController.js';
import adminController from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken, requireRole(['instructor','admin']));


// Get students assigned to a specific instructor
router.get('/:instructorId/students', adminController.getInstructorStudents);

// get specific student courses and progress
router.get('/student/:userId/courses', instructorController.getStudentCourses);

// Unified endpoint to update course access and grades
router.put('/student/:userId/courses/:courseId', instructorController.updateStudentCourseDetails);

export default router; 