const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  password: { type: String, required: true },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' }
  },
  interestedSchools: [{
    schoolNo: { type: String, required: true },
    schoolName: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User; 