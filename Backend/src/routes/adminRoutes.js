import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();


router.use(authenticateToken, requireRole(['admin']));


// Dashboard Statistics
router.get('/stats', adminController.getStatistics);

// Instructor Management
router.get('/instructors', adminController.listInstructors);
router.get('/instructors/:instructorId/students', adminController.getInstructorStudents);

// Student Management  
router.get('/students', adminController.listStudents); // Supports query params: ?search=term&instructorId=123
router.get('/students/:studentId', adminController.getStudentDetails);
router.delete('/delete/user/:userId', adminController.deleteUser);


// Assignment Operations (Most Important)
router.post('/students/:studentId/instructors/:instructorId', adminController.addInstructorToStudent);
router.delete('/students/:studentId/instructors/:instructorId', adminController.removeInstructorFromStudent);
router.post('/bulk-assign', adminController.bulkAssignInstructors); // Simplified: adds same instructors to all selected students

// Assignment Matrix View
router.get('/assignment-matrix', adminController.getAssignmentMatrix);

// ============ UTILITY ROUTES (Less Common) ============

// Batch Operations
router.post('/students/:studentId/clear-instructors', adminController.clearStudentInstructors);
router.post('/students/:studentId/replace-instructors', adminController.replaceStudentInstructors);

// Import/Export
router.get('/export/assignments', adminController.exportAssignments);
router.post('/import/assignments', adminController.importAssignments);

export default router;