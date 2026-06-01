import { User, Course, Enrollment, Progress } from '../models/index.js';

class InstructorController {





  // Get courses and progress for a student
  async getStudentCourses(req, res) {
    try {
      const { userId } = req.params;
      // verify student exists
      const student = await User.findById(userId);
      if (!student || student.role !== 'student') {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // get enrollments
      const enrollments = await Enrollment.find({ userId }).populate('courseId', 'title description modules');

      // get progress grouped by course
      const progress = await Progress.find({ userId });
      const progressByCourse = progress.reduce((acc, p) => {
        const cid = p.courseId.toString();
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(p);
        return acc;
      }, {});

      const data = enrollments.map((en) => {
        const courseObj = en.courseId;
        const courseIdStr = courseObj._id.toString();

        // map progress to include module info
        const courseProgress = (progressByCourse[courseIdStr] || []).map((pr) => {
          const moduleMeta = courseObj.modules.find((m) => m._id.toString() === pr.moduleId.toString());
          return {
            _id: pr._id,
            moduleId: pr.moduleId,
            stars: pr.stars,
            isOpen: pr.isOpen,
            // safely add module meta if found
            moduleTitle: moduleMeta?.title || null,
            moduleOrder: moduleMeta?.order ?? null
          };
        });

        return {
          course: {
            _id: courseObj._id,
            title: courseObj.title,
            description: courseObj.description,
          },
          isOpen: en.isOpen,
          progress: courseProgress
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error('Get Student Courses Error:', error);
      res.status(500).json({ success: false, message: 'Failed to get student courses', error: error.message });
    }
  }

  // New method to replace setCourseAccess and individual progress updates
  async updateStudentCourseDetails(req, res) {
    try {
      const { userId, courseId } = req.params;
      const { isOpen, progress } = req.body;
      // Validate user and course
      const studentPromise = User.findById(userId);
      const coursePromise = Course.findById(courseId).select('_id modules._id');
      const [student, course] = await Promise.all([studentPromise, coursePromise]);

      if (!student || student.role !== 'student') {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const promises = [];

      // Update enrollment (course access)
      if (typeof isOpen === 'boolean') {
        const enrollmentPromise = Enrollment.findOneAndUpdate(
          { userId, courseId },
          { isOpen },
          { upsert: true }
        );
        promises.push(enrollmentPromise);
      }

      // Update progress (grades and module access)
      if (Array.isArray(progress)) {
        const validModuleIds = new Set(course.modules.map(m => m._id.toString()));
        const bulkOps = progress
          .map(p => {
            const starsNum = p?.stars !== undefined ? parseInt(p.stars, 10) : NaN;
            const hasValidStars = !isNaN(starsNum) && starsNum >= 0 && starsNum <= 5;
            const hasIsOpen = typeof p?.isOpen === 'boolean';
            return { ...p, starsNum, hasValidStars, hasIsOpen };
          })
          .filter(p =>
            p.moduleId &&
            validModuleIds.has(p.moduleId.toString()) &&
            (p.hasValidStars || p.hasIsOpen)
          )
          .map(p => {
            const setFields = { userId, courseId, moduleId: p.moduleId };
            if (p.hasValidStars) setFields.stars = p.starsNum;
            if (p.hasIsOpen) setFields.isOpen = p.isOpen;
            return {
              updateOne: {
                filter: { userId, moduleId: p.moduleId },
                update: { $set: setFields },
                upsert: true
              }
            };
          });

        if (bulkOps.length > 0) {
          promises.push(Progress.bulkWrite(bulkOps));
        }
      }
      
      if (promises.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data provided for update.' });
      }

      await Promise.all(promises);
      res.json({ success: true, message: 'Student course details updated successfully.' });
    } catch (error) {
      console.error('Update Student Course Details Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update details', error: error.message });
    }
  }
}

export default new InstructorController(); 