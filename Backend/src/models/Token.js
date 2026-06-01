import mongoose from 'mongoose';

// Refresh Token Schema
const refreshTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    default: Date.now,
    expires: 2592000 // 30 days in seconds
  }
}, {
  timestamps: true
});





// Static methods for token cleanup
refreshTokenSchema.statics.cleanupExpired = function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};



// Models
const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);



export { RefreshToken }; 