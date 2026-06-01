import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        index: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    imageUri: {
        type: String,
        trim: true
    },
    options: [
        {
            text: {
                type: String,
                required: true,
                trim: true
            },
            isCorrect: {
                type: Boolean,
                required: true
            }
        }
    ]
}, {
    timestamps: true 
});

const quizSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true
    },
    questions: [questionSchema]
}, {
    timestamps: true 
});

const Quiz = mongoose.model('Quiz', quizSchema);


export { Quiz };