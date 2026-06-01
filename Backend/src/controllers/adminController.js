import { User } from '../models/index.js';
import userService from '../services/userService.js';

class AdminController {
  // ============ DASHBOARD STATISTICS ============
  async getStatistics(req, res) {
    try {
      const students = await User.find({ role: 'student' })
        .select('assignedInstructors');
      
      const instructors = await User.countDocuments({ role: 'instructor' });
      
      const totalStudents = students.length;
      const unassignedStudents = students.filter(s => s.assignedInstructors.length === 0).length;
      const totalAssignments = students.reduce((sum, s) => sum + s.assignedInstructors.length, 0);
      const avgInstructorsPerStudent = totalStudents > 0 ? (totalAssignments / totalStudents).toFixed(2) : 0;
      
      // Calculate instructor workload distribution
      const instructorWorkload = {};
      students.forEach(student => {
        student.assignedInstructors.forEach(instructorId => {
          const id = instructorId.toString();
          instructorWorkload[id] = (instructorWorkload[id] || 0) + 1;
        });
      });
      
      res.json({
        success: true,
        data: {
          totalStudents,
          totalInstructors: instructors,
          unassignedStudents,
          totalAssignments,
          avgInstructorsPerStudent: parseFloat(avgInstructorsPerStudent),
          instructorWorkload
        }
      });
    } catch (error) {
      console.error('Get Statistics Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get statistics', 
        error: error.message 
      });
    }
  }

  // ============ INSTRUCTOR MANAGEMENT ============
  async listInstructors(req, res) {
    try {
      const instructors = await User.find({ role: 'instructor' })
        .select('_id userName firstName lastName birthDate')
        .sort('lastName firstName');
      
      // Include student count for each instructor
      const instructorsWithCount = await Promise.all(
        instructors.map(async (instructor) => {
          const studentCount = await User.countDocuments({
            role: 'student',
            assignedInstructors: instructor._id
          });
          
          return {
            ...instructor.toObject(),
            studentCount
          };
        })
      );
      
      res.json({ 
        success: true, 
        data: instructorsWithCount 
      });
    } catch (error) {
      console.error('List Instructors Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to list instructors', 
        error: error.message 
      });
    }
  }

  async getInstructorStudents(req, res) {
    try {
      const { instructorId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      // Verify instructor exists
      const instructor = await User.findById(instructorId)
        .select('_id userName firstName lastName role');
      

        
      if (!instructor || instructor.role !== 'instructor') {
        return res.status(404).json({ 
          success: false, 
          message: 'Instructor not found' 
        });
      }

      // Get students with pagination
      const skip = (page - 1) * limit;
      const students = await User.find({ 
        role: 'student',
        assignedInstructors: instructorId 
      })
        .select('_id userName firstName lastName birthDate assignedInstructors')
        .populate('assignedInstructors', 'userName firstName lastName')
        .sort('lastName firstName')
        .skip(skip)
        .limit(parseInt(limit));
      
      const totalCount = await User.countDocuments({ 
        role: 'student',
        assignedInstructors: instructorId 
      });
      
      res.json({ 
        success: true, 
        data: {
          instructor,
          students,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get Instructor Students Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get instructor students', 
        error: error.message 
      });
    }
  }

  // ============ STUDENT MANAGEMENT ============
  async listStudents(req, res) {
    try {
      const { 
        search = '', 
        instructorId = '', 
        unassigned = false,
        page = 1, 
        limit = 20,
        sortBy = 'lastName',
        sortOrder = 'asc'
      } = req.query;

      // Build query
      const query = { role: 'student' };
      
      // Search filter
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { userName: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Instructor filter
      if (instructorId) {
        query.assignedInstructors = instructorId;
      }
      
      // Unassigned filter
      if (unassigned === 'true') {
        query.assignedInstructors = { $size: 0 };
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const students = await User.find(query)
        .select('_id userName firstName lastName birthDate assignedInstructors createdAt')
        .populate('assignedInstructors', 'userName firstName lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));
      
      const totalCount = await User.countDocuments(query);
      
      res.json({ 
        success: true, 
        data: students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('List Students Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to list students', 
        error: error.message 
      });
    }
  }

  async getStudentDetails(req, res) {
    try {
      const { studentId } = req.params;
      
      const student = await User.findOne({ 
        _id: studentId,
        role: 'student'
      })
        .select('-password')
        .populate('assignedInstructors', 'userName firstName lastName');
      
      if (!student) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }

      res.json({ 
        success: true, 
        data: student 
      });
    } catch (error) {
      console.error('Get Student Details Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get student details', 
        error: error.message 
      });
    }
  }

  // Deletion
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      await userService.deleteUser(userId)

      res.json({
        success: true,
        message:`User ${user.userName} has been successfully deleted!`
      })
    } catch (error){
      console.error("Failed to delete user", error);
      res.status(500).json({
        message:`Failed to delete user:${error.message}`
      })
    }
  }

  // ============ ASSIGNMENT OPERATIONS ============
  async addInstructorToStudent(req, res) {
    try {
      const { studentId, instructorId } = req.params;
      
      // Verify both exist and have correct roles
      const [student, instructor] = await Promise.all([
        User.findOne({ _id: studentId, role: 'student' }),
        User.findOne({ _id: instructorId, role: 'instructor' })
      ]);
      
      if (!student) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }
      
      if (!instructor) {
        return res.status(404).json({ 
          success: false, 
          message: 'Instructor not found' 
        });
      }
      
      // Check if already assigned
      if (student.assignedInstructors.includes(instructorId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Instructor already assigned to this student' 
        });
      }
      
      // Add instructor
      student.assignedInstructors.push(instructorId);
      await student.save();
      
      // Return updated student
      const updatedStudent = await User.findById(studentId)
        .select('_id userName firstName lastName assignedInstructors')
        .populate('assignedInstructors', 'userName firstName lastName');
      
      res.json({ 
        success: true, 
        message: 'Instructor successfully assigned to student',
        data: updatedStudent
      });
    } catch (error) {
      console.error('Add Instructor to Student Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add instructor to student', 
        error: error.message 
      });
    }
  }

  async removeInstructorFromStudent(req, res) {
    try {
      const { studentId, instructorId } = req.params;
      
      // Find and update student
      const result = await User.updateOne(
        { 
          _id: studentId,
          role: 'student',
          assignedInstructors: instructorId
        },
        { 
          $pull: { assignedInstructors: instructorId }
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found or instructor not assigned' 
        });
      }
      
      // Return updated student
      const updatedStudent = await User.findById(studentId)
        .select('_id userName firstName lastName assignedInstructors')
        .populate('assignedInstructors', 'userName firstName lastName');
      
      res.json({ 
        success: true, 
        message: 'Instructor successfully removed from student',
        data: updatedStudent
      });
    } catch (error) {
      console.error('Remove Instructor from Student Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to remove instructor from student', 
        error: error.message 
      });
    }
  }

  async bulkAssignInstructors(req, res) {
    try {
      const { studentIds, instructorIds, action = 'add' } = req.body;
      
      // Validate input
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'studentIds array is required and cannot be empty' 
        });
      }
      
      if (!Array.isArray(instructorIds) || instructorIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'instructorIds array is required and cannot be empty' 
        });
      }
      
      // Verify all students and instructors exist
      const [students, instructors] = await Promise.all([
        User.find({ _id: { $in: studentIds }, role: 'student' }),
        User.find({ _id: { $in: instructorIds }, role: 'instructor' })
      ]);
      
      if (students.length !== studentIds.length) {
        return res.status(400).json({ 
          success: false, 
          message: `Only found ${students.length} valid students out of ${studentIds.length} provided` 
        });
      }
      
      if (instructors.length !== instructorIds.length) {
        return res.status(400).json({ 
          success: false, 
          message: `Only found ${instructors.length} valid instructors out of ${instructorIds.length} provided` 
        });
      }
      
      // Perform bulk update based on action
      let result;
      if (action === 'add') {
        // Add instructors to all selected students
        result = await User.updateMany(
          { 
            _id: { $in: studentIds },
            role: 'student'
          },
          { 
            $addToSet: { assignedInstructors: { $each: instructorIds } }
          }
        );
      } else if (action === 'remove') {
        // Remove instructors from all selected students
        result = await User.updateMany(
          { 
            _id: { $in: studentIds },
            role: 'student'
          },
          { 
            $pullAll: { assignedInstructors: instructorIds }
          }
        );
      } else if (action === 'replace') {
        // Replace all instructors for selected students
        result = await User.updateMany(
          { 
            _id: { $in: studentIds },
            role: 'student'
          },
          { 
            assignedInstructors: instructorIds
          }
        );
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action. Must be "add", "remove", or "replace"' 
        });
      }
      
      res.json({ 
        success: true, 
        message: `Successfully ${action}ed instructors for ${result.modifiedCount} students`,
        data: {
          action,
          studentsModified: result.modifiedCount,
          studentsMatched: result.matchedCount,
          instructorIds,
          studentIds
        }
      });
    } catch (error) {
      console.error('Bulk Assign Instructors Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to bulk assign instructors', 
        error: error.message 
      });
    }
  }

  async getAssignmentMatrix(req, res) {
    try {
      // Get all students and instructors
      const [students, instructors] = await Promise.all([
        User.find({ role: 'student' })
          .select('_id userName firstName lastName assignedInstructors')
          .sort('lastName firstName'),
        User.find({ role: 'instructor' })
          .select('_id userName firstName lastName')
          .sort('lastName firstName')
      ]);
      
      // Build matrix data
      const matrix = students.map(student => ({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentUserName: student.userName,
        assignments: instructors.map(instructor => ({
          instructorId: instructor._id,
          assigned: student.assignedInstructors.some(
            id => id.toString() === instructor._id.toString()
          )
        }))
      }));
      
      res.json({ 
        success: true, 
        data: {
          instructors: instructors.map(i => ({
            _id: i._id,
            name: `${i.firstName} ${i.lastName}`,
            userName: i.userName
          })),
          matrix
        }
      });
    } catch (error) {
      console.error('Get Assignment Matrix Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get assignment matrix', 
        error: error.message 
      });
    }
  }

  // ============ UTILITY OPERATIONS ============
  async clearStudentInstructors(req, res) {
    try {
      const { studentId } = req.params;
      
      const result = await User.updateOne(
        { 
          _id: studentId,
          role: 'student'
        },
        { 
          assignedInstructors: []
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'All instructors removed from student',
        data: { studentId }
      });
    } catch (error) {
      console.error('Clear Student Instructors Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to clear student instructors', 
        error: error.message 
      });
    }
  }

  async replaceStudentInstructors(req, res) {
    try {
      const { studentId } = req.params;
      const { instructorIds } = req.body;
      
      if (!Array.isArray(instructorIds)) {
        return res.status(400).json({ 
          success: false, 
          message: 'instructorIds must be an array' 
        });
      }
      
      // Verify all instructors exist
      if (instructorIds.length > 0) {
        const instructors = await User.find({ 
          _id: { $in: instructorIds },
          role: 'instructor'
        });
        
        if (instructors.length !== instructorIds.length) {
          return res.status(400).json({ 
            success: false, 
            message: 'Some instructor IDs are invalid' 
          });
        }
      }
      
      // Update student
      const result = await User.updateOne(
        { 
          _id: studentId,
          role: 'student'
        },
        { 
          assignedInstructors: instructorIds
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }
      
      // Return updated student
      const updatedStudent = await User.findById(studentId)
        .select('_id userName firstName lastName assignedInstructors')
        .populate('assignedInstructors', 'userName firstName lastName');
      
      res.json({ 
        success: true, 
        message: 'Student instructors replaced successfully',
        data: updatedStudent
      });
    } catch (error) {
      console.error('Replace Student Instructors Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to replace student instructors', 
        error: error.message 
      });
    }
  }

  // ============ IMPORT/EXPORT ============
  async exportAssignments(req, res) {
    try {
      const { format = 'json' } = req.query;
      
      const students = await User.find({ role: 'student' })
        .select('userName firstName lastName assignedInstructors')
        .populate('assignedInstructors', 'userName firstName lastName')
        .sort('lastName firstName');
      
      if (format === 'csv') {
        // Build CSV content
        let csv = 'Student Username,Student Name,Instructor Usernames\n';
        students.forEach(student => {
          const instructorUsernames = student.assignedInstructors
            .map(i => i.userName)
            .join(';');
          csv += `${student.userName},"${student.firstName} ${student.lastName}","${instructorUsernames}"\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment('assignments.csv');
        return res.send(csv);
      }
      
      // Default to JSON
      res.json({
        success: true,
        exportDate: new Date().toISOString(),
        totalStudents: students.length,
        data: students
      });
    } catch (error) {
      console.error('Export Assignments Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to export assignments', 
        error: error.message 
      });
    }
  }

  async importAssignments(req, res) {
    try {
      const { assignments } = req.body;
      
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ 
          success: false, 
          message: 'assignments must be an array' 
        });
      }
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const assignment of assignments) {
        try {
          const { studentUsername, instructorUsernames } = assignment;
          
          // Find student
          const student = await User.findOne({ 
            userName: studentUsername.toLowerCase(),
            role: 'student'
          });
          
          if (!student) {
            errors.push(`Student ${studentUsername} not found`);
            errorCount++;
            continue;
          }
          
          // Find instructors
          const instructors = await User.find({
            userName: { $in: instructorUsernames.map(u => u.toLowerCase()) },
            role: 'instructor'
          });
          
          if (instructors.length !== instructorUsernames.length) {
            errors.push(`Some instructors for ${studentUsername} not found`);
            errorCount++;
            continue;
          }
          
          // Update student
          student.assignedInstructors = instructors.map(i => i._id);
          await student.save();
          successCount++;
        } catch (err) {
          errors.push(`Error processing ${assignment.studentUsername}: ${err.message}`);
          errorCount++;
        }
      }
      
      res.json({
        success: true,
        message: `Import completed: ${successCount} successful, ${errorCount} failed`,
        data: {
          successCount,
          errorCount,
          errors: errors.slice(0, 10) // Limit error messages
        }
      });
    } catch (error) {
      console.error('Import Assignments Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to import assignments', 
        error: error.message 
      });
    }
  }
}

export default new AdminController();