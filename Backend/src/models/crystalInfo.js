import mongoose from "mongoose";

// Links crystal info to user
const crystalInfoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    crystal:{
        type: Number,
        default: 0
    },
    moduleCompleted: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module'
    }]
},{
    timestamps: true
});

const CrystalInfo = mongoose.model('CrystalInfo', crystalInfoSchema);

export default CrystalInfo;