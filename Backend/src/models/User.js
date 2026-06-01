import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';


const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim:true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    required: true,
    enum: ['student', 'instructor','admin']
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  birthDate: {
    type: Date,
    required: function() { return this.role === 'student'; }
  },
  assignedInstructors: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: [],
    validate: {
      validator: function(v) {
        // Only students can have assigned instructors
        return this.role === 'student' || v.length === 0;
      },
      message: 'Only students can have assigned instructors'
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});


userSchema.pre('save', function(next) {
  if (this.role !== 'student' && this.assignedInstructors && this.assignedInstructors.length > 0) {
    this.assignedInstructors = [];
  }
  next();
});

// Instance method to get user without password
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Instance method to check if student has a specific instructor
userSchema.methods.hasInstructor = function(instructorId) {
  return this.assignedInstructors.some(id => id.equals(instructorId));
};

// Instance method to add an instructor (prevents duplicates)
userSchema.methods.addInstructor = async function(instructorId) {
  if (this.role !== 'student') {
    throw new Error('Only students can have instructors');
  }
  
  if (!this.hasInstructor(instructorId)) {
    this.assignedInstructors.push(instructorId);
    return this.save();
  }
  return this;
};

// Instance method to remove an instructor
userSchema.methods.removeInstructor = async function(instructorId) {
  this.assignedInstructors = this.assignedInstructors.filter(
    id => !id.equals(instructorId)
  );
  return this.save();
};

userSchema.statics.findByUserName = function (userName) {
  return this.findOne({ userName: userName.toLowerCase() });
}

/**
 * Create a new user.
 * @param {Object} userData - { userName, password, role, firstName, lastName, birthDate?, assignedInstructors? }
 * @returns {Promise<Object>} created user object without password (toSafeObject)
 * @throws {Error} on validation or if username exists
 */
export const createUser = async (userData) => {
  const {
    userName,
    password,
    role,
    firstName,
    lastName,
    birthDate,
    assignedInstructors,
  } = userData || {};

  if (!userName || !password || !role || !firstName || !lastName) {
    throw new Error('Missing required fields: userName, password, role, firstName, lastName');
  }

  // normalize username
  const normalizedUserName = String(userName).toLowerCase().trim();

  // check duplicate
  const exists = await User.findByUserName(normalizedUserName);
  if (exists) {
    throw new Error('Username already exists');
  }

  // hash password
  const SALT_ROUNDS = 10;
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const user = new User({
    userName: normalizedUserName,
    password: hashed,
    role,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    birthDate: birthDate ? new Date(birthDate) : undefined,
    assignedInstructors: Array.isArray(assignedInstructors) ? assignedInstructors : undefined,
  });

  const saved = await user.save();
  return saved.toSafeObject();
};


//console.log("test")
if (true) {
  (async () => {
    try {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/curiocampauth';
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
      }

      const username = 'student';
      const existing = await User.findOne({ userName: username });
      if (!existing) {
        const hashed = await bcrypt.hash('password123', 10);
        const created = await User.create({
          userName: username,
          password: hashed,
          role: 'student',
          firstName: 'Student',
          lastName: 'User',
          birthDate: new Date('2000-01-01'),
          assignedInstructors: [],
        });
        console.log('Created example user:', created.toSafeObject());
      } else {
        console.log('Example user already exists:', existing.userName);
      }
      const instructorUsername = 'instructor';
      const instructorExisting = await User.findOne({ userName: instructorUsername });
      if (!instructorExisting) {
        const hashed = await bcrypt.hash('password123', 10);
        const created = await User.create({
          userName: instructorUsername,
          password: hashed,
          role: 'instructor',
          firstName: 'Instructor',
          lastName: 'User',
          birthDate: new Date('1990-01-01'),
          assignedInstructors: [],
        });
        console.log('Created example instructor:', created.toSafeObject());
      } else {
        console.log('Example instructor already exists:', instructorExisting.userName);
      }
      const adminUsername = 'admin';
      const adminExisting = await User.findOne({ userName: adminUsername });
      if (!adminExisting) {
        const hashed = await bcrypt.hash('password123', 10);
        const created = await User.create({
          userName: adminUsername,
          password: hashed,
          role: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          birthDate: new Date('1985-01-01'),
          assignedInstructors: [],
        });
        console.log('Created example admin:', created.toSafeObject());
      } else {
        console.log('Example admin already exists:', adminExisting.userName);
      }
    } catch (err) {
      console.error('Error creating example user:', err);
    }
  })();
}
const User = mongoose.model('User', userSchema);

export default User; 