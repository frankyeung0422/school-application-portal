const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const schoolMonitorSchema = new Schema({
  schoolNo: { type: String, required: true, unique: true },
  schoolName: { type: String, required: true },
  websiteUrl: { type: String, required: true },
  applicationPageUrl: { type: String },
  lastChecked: { type: Date },
  lastContentHash: { type: String },
  lastContent: { type: String },
  isActive: { type: Boolean, default: true },
  checkFrequency: { 
    type: String, 
    enum: ['hourly', 'daily', 'weekly'], 
    default: 'daily' 
  },
  applicationStatus: {
    isOpen: { type: Boolean, default: false },
    lastUpdated: { type: Date },
    startDate: { type: Date }, // Application start date
    endDate: { type: Date }, // Application end date
    deadline: { type: Date }, // Legacy field for backward compatibility
    requirements: [String],
    notes: String
  },
  monitoringConfig: {
    keywords: [String], // Keywords to look for in application content
    excludeKeywords: [String], // Keywords to ignore
    contentSelectors: [String], // CSS selectors for specific content areas
    checkForChanges: { type: Boolean, default: true },
    checkForDeadlines: { type: Boolean, default: true }
  },
  errorCount: { type: Number, default: 0 },
  lastError: { type: String },
  successCount: { type: Number, default: 0 }
}, {
  timestamps: true,
});

// Index for efficient querying
schoolMonitorSchema.index({ schoolNo: 1 });
schoolMonitorSchema.index({ isActive: 1, lastChecked: 1 });

const SchoolMonitor = mongoose.model('SchoolMonitor', schoolMonitorSchema);

module.exports = SchoolMonitor; 