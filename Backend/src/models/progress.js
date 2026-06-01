import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
        },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true
    },
  // Grade represented by number of stars (0-5)
    stars: {
        type: Number,
        min: 0,
        max: 3,
        default: 0
    },
    // If true, module is open/accessible for the student. If false, it's locked.
    isOpen: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Ensure unique progress per user per module
progressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;