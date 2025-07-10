const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  schoolNo: { type: String, required: true },
  schoolName: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['application_open', 'application_closed', 'website_update', 'deadline_reminder'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed', 'read'], 
    default: 'pending' 
  },
  deliveryMethod: [{
    type: String,
    enum: ['email', 'push', 'sms'],
    required: true
  }],
  sentAt: { type: Date },
  readAt: { type: Date },
  metadata: {
    websiteUrl: { type: String },
    changeDetected: { type: String },
    previousContent: { type: String },
    newContent: { type: String }
  }
}, {
  timestamps: true,
});

// Index for efficient querying
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ schoolNo: 1, type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 