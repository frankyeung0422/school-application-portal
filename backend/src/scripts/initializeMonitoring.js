const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SchoolMonitor = require('../models/schoolMonitor.model');

// Sample school websites for monitoring (these would be real school websites)
const sampleSchoolWebsites = {
  'KG001': {
    name: 'Sample Kindergarten 1',
    website: 'https://www.samplekg1.edu.hk',
    applicationPage: 'https://www.samplekg1.edu.hk/admission'
  },
  'KG002': {
    name: 'Sample Kindergarten 2', 
    website: 'https://www.samplekg2.edu.hk',
    applicationPage: 'https://www.samplekg2.edu.hk/enrollment'
  },
  'KG003': {
    name: 'Sample Kindergarten 3',
    website: 'https://www.samplekg3.edu.hk',
    applicationPage: 'https://www.samplekg3.edu.hk/application'
  }
};

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-portal';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const initializeMonitoring = async () => {
  try {
    console.log('Initializing school monitoring system...');

    // Load existing kindergarten data
    const dataPath = path.join(__dirname, '..', '..', 'scraped_data.json');
    let kindergartens = [];
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      kindergartens = JSON.parse(data);
      console.log(`Loaded ${kindergartens.length} kindergartens from scraped data`);
    }

    // Create monitoring entries for schools
    const monitoringEntries = [];
    
    for (const kg of kindergartens.slice(0, 10)) { // Start with first 10 schools
      const schoolNo = kg.school_no;
      const sampleWebsite = sampleSchoolWebsites[schoolNo] || {
        name: kg.name_en,
        website: `https://www.${schoolNo.toLowerCase()}.edu.hk`,
        applicationPage: `https://www.${schoolNo.toLowerCase()}.edu.hk/admission`
      };

      const monitoringEntry = {
        schoolNo: schoolNo,
        schoolName: kg.name_en,
        websiteUrl: sampleWebsite.website,
        applicationPageUrl: sampleWebsite.applicationPage,
        checkFrequency: 'daily',
        isActive: true,
        applicationStatus: {
          isOpen: false,
          lastUpdated: new Date(),
          deadline: null,
          requirements: [],
          notes: 'Initialized from existing data'
        },
        monitoringConfig: {
          keywords: [
            'application', 'admission', 'enrollment', 'registration',
            'apply', 'applications open', 'admissions open',
            'deadline', 'due date', 'closing date'
          ],
          excludeKeywords: [
            'closed', 'ended', 'finished', 'completed',
            'no longer accepting', 'not accepting'
          ],
          contentSelectors: [
            '.admission-info', '.application-info', '.enrollment-info',
            '.main-content', 'main', 'article', '.content'
          ],
          checkForChanges: true,
          checkForDeadlines: true
        },
        errorCount: 0,
        successCount: 0,
        lastChecked: null,
        lastContentHash: null,
        lastContent: null
      };

      monitoringEntries.push(monitoringEntry);
    }

    // Clear existing monitoring data
    await SchoolMonitor.deleteMany({});
    console.log('Cleared existing monitoring data');

    // Insert new monitoring entries
    const result = await SchoolMonitor.insertMany(monitoringEntries);
    console.log(`Created ${result.length} monitoring entries`);

    // Display summary
    console.log('\nMonitoring System Initialized:');
    console.log('==============================');
    console.log(`Total schools being monitored: ${result.length}`);
    console.log(`Active monitoring: ${result.filter(r => r.isActive).length}`);
    console.log(`Inactive monitoring: ${result.filter(r => !r.isActive).length}`);
    
    console.log('\nSample schools added to monitoring:');
    result.slice(0, 5).forEach(school => {
      console.log(`- ${school.schoolName} (${school.schoolNo})`);
      console.log(`  Website: ${school.websiteUrl}`);
      console.log(`  Application Page: ${school.applicationPageUrl}`);
      console.log(`  Frequency: ${school.checkFrequency}`);
      console.log('');
    });

    console.log('Monitoring system ready! The scheduler will start monitoring these schools automatically.');
    console.log('You can manually trigger monitoring using: POST /api/monitoring/monitor-all');

  } catch (error) {
    console.error('Error initializing monitoring:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the initialization
if (require.main === module) {
  connectDB().then(() => {
    initializeMonitoring();
  });
}

module.exports = { initializeMonitoring }; 