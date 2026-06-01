import mongoose from 'mongoose';


const materialSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['pdf', 'doc', 'docx', 'txt', 'other'],
        required: true        
    },
    // Storage information
    storageType: {
        type: String,
        enum: ['s3', 'cloudinary', 'local'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    // For cloud storage
    cloudKey: String, // S3 key or Cloudinary public_id
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        index: true
    },
}, {
    timestamps: true 
});


const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    order: {
        type: Number,
        required: true
    },
    isModuleOpen: {
        type: Boolean,
        default: false
    },
    crystals: {
        type: Number,
        default: 0
    },
    materials: [
        {
            materialId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Material',
                required: true
            },
            type: {
                type: String, 
                required: true,
                trim: true
            },
            name: {
                type: String,
                required:true
            }
        }
    ]
}, {
    timestamps: true 
});


const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    thumbnail: {
        url: String,
        cloudKey: String,
        filename:String
    },
    modules: [moduleSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
}, {
    timestamps: true 
});


const Material = mongoose.model('Material', materialSchema);
const Course = mongoose.model('Course', courseSchema);

export { Course, Material };