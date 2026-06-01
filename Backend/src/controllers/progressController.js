import Progress from '../models/progress.js';
import { Course } from '../models/course.js';

class ProgressController {
  // Student: get their own progress for a course
  async getOwnProgress(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.userId;

      // validate course exists
      const course = await Course.findById(courseId).select('_id');
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const progress = await Progress.find({ userId, courseId });
      res.json({ success: true, data: progress });
    } catch (error) {
      console.error('Get Own Progress Error:', error);
      res.status(500).json({ success: false, message: 'Failed to get progress', error: error.message });
    }
  }

  // Instructor: get all students progress for a course
  async getCourseProgress(req, res) {
    try {
      const { courseId } = req.params;
      const course = await Course.findById(courseId).select('_id');
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const progress = await Progress.find({ courseId });
      res.json({ success: true, data: progress });
    } catch (error) {
      console.error('Get Course Progress Error:', error);
      res.status(500).json({ success: false, message: 'Failed to get course progress', error: error.message });
    }
  }
}

export default new ProgressController(); 