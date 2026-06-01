import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import studyController from '../controllers/studyController.js'

const router = express.Router();

router.get('/quiz/:quizId/questions/:questionId/image', studyController.downloadQuizQuestionImage);
router.get('/crystals/:userId/count', studyController.getCrystalCount);

router.use(authenticateToken);

router.get('/:userId/courses', studyController.getCourses);
router.get('/quiz/:courseId/:moduleId', studyController.getQuiz);
router.post('/user/:userId/quiz/:quizId/attempt', studyController.submitQuiz);
router.post("/crystals/:userId/redeem", studyController.redeemItem);


export default router