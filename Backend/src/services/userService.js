import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { Course, Enrollment } from '../models/index.js';
import { Progress } from '../models/index.js';

class UserService {


  // Create new user
  async createStaff(userData) {
    const { role, firstName, lastName } = userData;

    // Generate unique username using shared helper
    const userName = await this.generateUniqueUserName(firstName, lastName);

    // Generate random 8-character alphanumeric password
    const generatedPassword = Math.floor(100000 + Math.random() * 900000);

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(generatedPassword.toString(), saltRounds);


    // Create user
    const user = new User({
      userName: userName.toLowerCase(),
      password: hashedPassword,
      role,
      firstName,
      lastName,
    });

    await user.save();

    return { user, generatedPassword };
  }

  async createStudent(userData) {
    const { firstName, lastName, birthDate } = userData;
    
    if (!firstName || !lastName || !birthDate) {
      throw new Error('firstName, lastName and birthDate are required');
    }


    // Generate unique username using shared helper
    const userName = await this.generateUniqueUserName(firstName, lastName);
    console.log(userName);
    // Generate random 8-character alphanumeric password
    const generatedPassword = Math.floor(100000 + Math.random() * 900000);

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(generatedPassword.toString(), saltRounds);

    // Create user document
    const user = new User({
      userName,
      password: hashedPassword,
      role: 'student',
      firstName,
      lastName,
      birthDate,

    });

    await user.save();

    // Auto-enroll student in all courses (locked by default) – reuse existing logic
    const courses = await Course.find({}, '_id');
    if (courses.length) {
      const bulk = courses.map((c) => ({
        updateOne: {
          filter: { userId: user._id, courseId: c._id },
          update: { userId: user._id, courseId: c._id, isOpen: false },
          upsert: true
        }
      }));
      await Enrollment.bulkWrite(bulk);

      const coursesWithModules = await Course.find({}, 'modules _id');
      const progressBulk = [];
      coursesWithModules.forEach((c) => {
        c.modules.forEach((m) => {
          progressBulk.push({
            updateOne: {
              filter: { userId: user._id, moduleId: m._id },
              update: { userId: user._id, courseId: c._id, moduleId: m._id, stars: 0 },
              upsert: true
            }
          });
        });
      });
      if (progressBulk.length) {
        await Progress.bulkWrite(progressBulk);
      }
    }

    return { user, generatedPassword };
  }

  // Authenticate user
  async authenticateUser(userName, password) {
    // Find user
    const user = await User.findByUserName(userName);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return user;
  }

  // Get user by ID
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }


  // Get user profile (safe object without password)
  async getUserProfile(userId) {
    const user = await this.getUserById(userId);
    return user.toSafeObject();
  }

  // Delete user (for rollback purposes)
  async deleteUser(userId) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role === 'student') {
      await Enrollment.deleteMany({ userId });
      await Progress.deleteMany({ userId });
    } else if (user.role === 'instructor') {
      await User.updateMany(
        { role: 'student', assignedInstructors: user._id },
        { $pull: { assignedInstructors: user._id } }
      );
    }
    
  }


  validateUserData(userData) {
    const {role, firstName, lastName, birthDate } = userData;
    const errors = [];
    if (!firstName || !lastName || !role) {
      errors.push('firstName, lastName, and role are required');
    }

    if (!['instructor', 'admin'].includes(role)) {
      if (birthDate && isNaN(Date.parse(birthDate))) {
        errors.push('birthDate must be a valid date');
      }
    }

    return errors;
  }

  // Helper: generate a unique username based on first and last name
  async generateUniqueUserName(firstName, lastName) {
    const baseUserName = `${lastName.toLowerCase()}.${firstName.toLowerCase()}`;
    let userName = baseUserName;
    let counter = 1;
    while (await User.findByUserName(userName)) {
      userName = `${baseUserName}${counter}`;
      counter += 1;
    }
    return userName;
  }

}

export default new UserService(); 