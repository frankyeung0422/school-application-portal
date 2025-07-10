const express = require('express');
const router = express.Router();
const SchoolMonitor = require('../models/schoolMonitor.model');
const WebMonitorService = require('../services/webMonitorService');
const ApplicationDateMonitor = require('../services/applicationDateMonitor');
const schedulerService = require('../services/schedulerService');
const emailService = require('../services/emailService');

const webMonitorService = new WebMonitorService();
const applicationDateMonitor = new ApplicationDateMonitor();

// Get all monitored schools
router.get('/schools', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, hasWebsite } = req.query;
    
    const query = {};
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    if (hasWebsite === 'true') {
      query.hasRealWebsite = true;
    } else if (hasWebsite === 'false') {
      query.hasRealWebsite = false;
    }

    const schools = await SchoolMonitor.find(query)
      .sort({ lastChecked: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await SchoolMonitor.countDocuments(query);

    res.json({
      schools,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching monitored schools:', error);
    res.status(500).json({ error: 'Failed to fetch monitored schools' });
  }
});

// Get specific monitored school
router.get('/schools/:schoolNo', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    
    const school = await SchoolMonitor.findOne({ schoolNo });
    
    if (!school) {
      return res.status(404).json({ error: 'School not found in monitoring system' });
    }

    res.json(school);

  } catch (error) {
    console.error('Error fetching monitored school:', error);
    res.status(500).json({ error: 'Failed to fetch monitored school' });
  }
});

// Add school to monitoring
router.post('/schools', async (req, res) => {
  try {
    const { schoolNo, schoolName, websiteUrl, applicationPageUrl, checkFrequency } = req.body;
    
    // Check if already being monitored
    const existingSchool = await SchoolMonitor.findOne({ schoolNo });
    if (existingSchool) {
      return res.status(400).json({ error: 'School is already being monitored' });
    }

    const school = new SchoolMonitor({
      schoolNo,
      schoolName,
      websiteUrl,
      applicationPageUrl,
      checkFrequency: checkFrequency || 'daily',
      monitoringConfig: {
        keywords: ['application', 'admission', 'enrollment', 'registration'],
        excludeKeywords: ['closed', 'ended', 'finished'],
        contentSelectors: [],
        checkForChanges: true,
        checkForDeadlines: true
      }
    });

    await school.save();

    res.status(201).json(school);

  } catch (error) {
    console.error('Error adding school to monitoring:', error);
    res.status(500).json({ error: 'Failed to add school to monitoring' });
  }
});

// Update school monitoring configuration
router.put('/schools/:schoolNo', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    const updateData = req.body;
    
    const school = await SchoolMonitor.findOneAndUpdate(
      { schoolNo },
      updateData,
      { new: true }
    );

    if (!school) {
      return res.status(404).json({ error: 'School not found in monitoring system' });
    }

    res.json(school);

  } catch (error) {
    console.error('Error updating school monitoring:', error);
    res.status(500).json({ error: 'Failed to update school monitoring' });
  }
});

// Toggle school monitoring status
router.patch('/schools/:schoolNo/toggle', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    
    const school = await SchoolMonitor.findOne({ schoolNo });
    
    if (!school) {
      return res.status(404).json({ error: 'School not found in monitoring system' });
    }

    school.isActive = !school.isActive;
    await school.save();

    res.json({
      schoolNo,
      isActive: school.isActive,
      message: `Monitoring ${school.isActive ? 'enabled' : 'disabled'} for ${school.schoolName}`
    });

  } catch (error) {
    console.error('Error toggling school monitoring:', error);
    res.status(500).json({ error: 'Failed to toggle school monitoring' });
  }
});

// Remove school from monitoring
router.delete('/schools/:schoolNo', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    
    const school = await SchoolMonitor.findOneAndDelete({ schoolNo });
    
    if (!school) {
      return res.status(404).json({ error: 'School not found in monitoring system' });
    }

    res.json({ 
      message: `Removed ${school.schoolName} from monitoring`,
      schoolNo 
    });

  } catch (error) {
    console.error('Error removing school from monitoring:', error);
    res.status(500).json({ error: 'Failed to remove school from monitoring' });
  }
});

// Manually trigger monitoring for a specific school
router.post('/schools/:schoolNo/monitor', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    
    const result = await webMonitorService.monitorSchool(schoolNo);
    
    res.json({
      schoolNo,
      result,
      message: 'Manual monitoring completed'
    });

  } catch (error) {
    console.error('Error in manual school monitoring:', error);
    res.status(500).json({ error: 'Failed to monitor school' });
  }
});

// Manually trigger monitoring for all schools
router.post('/monitor-all', async (req, res) => {
  try {
    const results = await webMonitorService.monitorAllSchools();
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      withChanges: results.filter(r => r.hasChanged).length,
      withOpenApplications: results.filter(r => r.applicationStatus?.isOpen).length,
      errors: results.filter(r => !r.success).length
    };

    res.json({
      results,
      summary,
      message: 'Manual monitoring of all schools completed'
    });

  } catch (error) {
    console.error('Error in manual monitoring:', error);
    res.status(500).json({ error: 'Failed to monitor schools' });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const success = await emailService.sendTestEmail(email);
    
    if (success) {
      res.json({ 
        message: 'Test email sent successfully',
        email: email
      });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Get monitoring statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await SchoolMonitor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
          totalErrors: { $sum: '$errorCount' },
          totalSuccess: { $sum: '$successCount' },
          avgErrors: { $avg: '$errorCount' },
          avgSuccess: { $avg: '$successCount' }
        }
      }
    ]);

    const frequencyStats = await SchoolMonitor.aggregate([
      {
        $group: {
          _id: '$checkFrequency',
          count: { $sum: 1 }
        }
      }
    ]);

    const applicationStatusStats = await SchoolMonitor.aggregate([
      {
        $group: {
          _id: '$applicationStatus.isOpen',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentActivity = await SchoolMonitor.find()
      .sort({ lastChecked: -1 })
      .limit(10)
      .select('schoolNo schoolName lastChecked errorCount successCount');

    res.json({
      overall: stats[0] || { total: 0, active: 0, inactive: 0, totalErrors: 0, totalSuccess: 0, avgErrors: 0, avgSuccess: 0 },
      byFrequency: frequencyStats,
      byApplicationStatus: applicationStatusStats,
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring statistics' });
  }
});

// Get scheduler status
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = schedulerService.getJobStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    res.status(500).json({ error: 'Failed to fetch scheduler status' });
  }
});

// Manually trigger scheduler monitoring
router.post('/scheduler/trigger', async (req, res) => {
  try {
    const results = await schedulerService.triggerMonitoring();
    res.json({
      message: 'Scheduler monitoring triggered successfully',
      results
    });
  } catch (error) {
    console.error('Error triggering scheduler monitoring:', error);
    res.status(500).json({ error: 'Failed to trigger scheduler monitoring' });
  }
});

// Stop all scheduled jobs
router.post('/scheduler/stop', async (req, res) => {
  try {
    schedulerService.stopAllJobs();
    res.json({ message: 'All scheduled jobs stopped' });
  } catch (error) {
    console.error('Error stopping scheduled jobs:', error);
    res.status(500).json({ error: 'Failed to stop scheduled jobs' });
  }
});

// Restart scheduler
router.post('/scheduler/restart', async (req, res) => {
  try {
    schedulerService.stopAllJobs();
    schedulerService.initialize();
    res.json({ message: 'Scheduler restarted successfully' });
  } catch (error) {
    console.error('Error restarting scheduler:', error);
    res.status(500).json({ error: 'Failed to restart scheduler' });
  }
});

// Manually trigger application date monitoring for a specific school
router.post('/schools/:schoolNo/monitor-application-dates', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    
    const result = await applicationDateMonitor.monitorApplicationDates(schoolNo);
    
    res.json({
      schoolNo,
      result,
      message: 'Application date monitoring completed'
    });

  } catch (error) {
    console.error('Error in application date monitoring:', error);
    res.status(500).json({ error: 'Failed to monitor application dates' });
  }
});

// Manually trigger application date monitoring for all schools
router.post('/monitor-all-application-dates', async (req, res) => {
  try {
    const results = await applicationDateMonitor.monitorAllApplicationDates();
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      withApplicationChanges: results.filter(r => r.hasChanged).length,
      withOpenApplications: results.filter(r => r.applicationStatus?.isOpen).length,
      errors: results.filter(r => !r.success).length
    };

    res.json({
      results,
      summary,
      message: 'Application date monitoring of all schools completed'
    });

  } catch (error) {
    console.error('Error in application date monitoring:', error);
    res.status(500).json({ error: 'Failed to monitor application dates' });
  }
});

// Get application status summary
router.get('/application-status', async (req, res) => {
  try {
    const schools = await SchoolMonitor.find({ isActive: true })
      .select('schoolNo schoolName applicationStatus websiteUrl hasRealWebsite websiteVerified')
      .sort({ 'applicationStatus.lastUpdated': -1 });

    const summary = {
      total: schools.length,
      open: schools.filter(s => s.applicationStatus.isOpen).length,
      closed: schools.filter(s => !s.applicationStatus.isOpen).length,
      withDeadlines: schools.filter(s => s.applicationStatus.deadline).length,
      withRealWebsites: schools.filter(s => s.hasRealWebsite).length,
      verifiedWebsites: schools.filter(s => s.websiteVerified).length
    };

    res.json({
      summary,
      schools: schools.slice(0, 20) // Return first 20 schools
    });

  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({ error: 'Failed to fetch application status' });
  }
});

// Get schools with open applications
router.get('/open-applications', async (req, res) => {
  try {
    const schools = await SchoolMonitor.find({ 
      isActive: true, 
      'applicationStatus.isOpen': true 
    })
    .select('schoolNo schoolName applicationStatus websiteUrl applicationPageUrl')
    .sort({ 'applicationStatus.lastUpdated': -1 });

    res.json({
      count: schools.length,
      schools
    });

  } catch (error) {
    console.error('Error fetching open applications:', error);
    res.status(500).json({ error: 'Failed to fetch open applications' });
  }
});

// Get schools with upcoming deadlines
router.get('/upcoming-deadlines', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const schools = await SchoolMonitor.find({
      isActive: true,
      'applicationStatus.deadline': {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    })
    .select('schoolNo schoolName applicationStatus websiteUrl')
    .sort({ 'applicationStatus.deadline': 1 });

    res.json({
      count: schools.length,
      schools
    });

  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming deadlines' });
  }
});

// Test website connectivity
router.post('/test-website/:schoolNo', async (req, res) => {
  try {
    const { schoolNo } = req.params;
    
    const school = await SchoolMonitor.findOne({ schoolNo });
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const axios = require('axios');
    const startTime = Date.now();
    
    try {
      const response = await axios.get(school.websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        schoolNo,
        websiteUrl: school.websiteUrl,
        status: 'success',
        statusCode: response.status,
        responseTime: `${responseTime}ms`,
        contentLength: response.data.length,
        message: 'Website is accessible'
      });
      
    } catch (error) {
      res.json({
        schoolNo,
        websiteUrl: school.websiteUrl,
        status: 'error',
        error: error.message,
        message: 'Website is not accessible'
      });
    }

  } catch (error) {
    console.error('Error testing website:', error);
    res.status(500).json({ error: 'Failed to test website' });
  }
});

module.exports = router; 