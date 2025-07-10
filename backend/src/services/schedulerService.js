const cron = require('node-cron');
const webMonitorService = require('./webMonitorService');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const emailService = require('./emailService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.log('Scheduler already initialized');
      return;
    }

    console.log('Initializing scheduler service...');

    // Schedule daily monitoring at 9 AM
    this.scheduleDailyMonitoring();
    
    // Schedule weekly monitoring on Sundays at 10 AM
    this.scheduleWeeklyMonitoring();
    
    // Schedule notification processing every hour
    this.scheduleNotificationProcessing();
    
    // Schedule deadline reminders daily at 8 AM
    this.scheduleDeadlineReminders();

    this.isInitialized = true;
    console.log('Scheduler service initialized successfully');
  }

  scheduleDailyMonitoring() {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('Starting daily school monitoring...');
      try {
        const results = await webMonitorService.monitorAllSchools();
        console.log(`Daily monitoring completed. Processed ${results.length} schools.`);
        
        // Log summary
        const successful = results.filter(r => r.success).length;
        const withChanges = results.filter(r => r.hasChanged).length;
        const withOpenApplications = results.filter(r => r.applicationStatus?.isOpen).length;
        
        console.log(`Summary: ${successful} successful, ${withChanges} with changes, ${withOpenApplications} with open applications`);
        
      } catch (error) {
        console.error('Error in daily monitoring job:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Hong_Kong"
    });

    this.jobs.set('dailyMonitoring', job);
    console.log('Daily monitoring scheduled for 9:00 AM daily');
  }

  scheduleWeeklyMonitoring() {
    const job = cron.schedule('0 10 * * 0', async () => {
      console.log('Starting weekly comprehensive school monitoring...');
      try {
        // This could include more thorough checks, data validation, etc.
        const results = await webMonitorService.monitorAllSchools();
        console.log(`Weekly monitoring completed. Processed ${results.length} schools.`);
        
        // Generate weekly report
        await this.generateWeeklyReport(results);
        
      } catch (error) {
        console.error('Error in weekly monitoring job:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Hong_Kong"
    });

    this.jobs.set('weeklyMonitoring', job);
    console.log('Weekly monitoring scheduled for 10:00 AM on Sundays');
  }

  scheduleNotificationProcessing() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('Processing pending notifications...');
      try {
        await this.processPendingNotifications();
      } catch (error) {
        console.error('Error processing notifications:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Hong_Kong"
    });

    this.jobs.set('notificationProcessing', job);
    console.log('Notification processing scheduled for every hour');
  }

  scheduleDeadlineReminders() {
    const job = cron.schedule('0 8 * * *', async () => {
      console.log('Checking for upcoming deadlines...');
      try {
        await this.checkUpcomingDeadlines();
      } catch (error) {
        console.error('Error checking deadlines:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Hong_Kong"
    });

    this.jobs.set('deadlineReminders', job);
    console.log('Deadline reminders scheduled for 8:00 AM daily');
  }

  async processPendingNotifications() {
    try {
      // Get pending notifications grouped by user
      const pendingNotifications = await Notification.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: '$userId', notifications: { $push: '$$ROOT' } } }
      ]);

      for (const group of pendingNotifications) {
        const user = await User.findById(group._id);
        if (!user || !user.isActive) continue;

        // Check user's notification frequency preference
        const shouldSendNow = this.shouldSendNotificationNow(user, group.notifications);
        
        if (shouldSendNow) {
          // Send notifications based on user preferences
          for (const notification of group.notifications) {
            await webMonitorService.sendNotification(notification, user);
          }
        }
      }

      console.log(`Processed ${pendingNotifications.length} user notification groups`);
      
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  shouldSendNotificationNow(user, notifications) {
    const { frequency } = user.notificationPreferences;
    
    switch (frequency) {
      case 'immediate':
        return true;
      
      case 'daily':
        // Check if we should send daily digest
        const lastNotification = notifications[0];
        const hoursSinceLastNotification = (Date.now() - new Date(lastNotification.createdAt)) / (1000 * 60 * 60);
        return hoursSinceLastNotification >= 24;
      
      case 'weekly':
        // Check if we should send weekly digest
        const daysSinceLastNotification = (Date.now() - new Date(notifications[0].createdAt)) / (1000 * 60 * 60 * 24);
        return daysSinceLastNotification >= 7;
      
      default:
        return true;
    }
  }

  async checkUpcomingDeadlines() {
    try {
      // This would check for schools with upcoming deadlines and send reminders
      // Implementation depends on how deadlines are stored and tracked
      console.log('Deadline reminder check completed');
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }

  async generateWeeklyReport(results) {
    try {
      const report = {
        totalSchools: results.length,
        successfulChecks: results.filter(r => r.success).length,
        schoolsWithChanges: results.filter(r => r.hasChanged).length,
        schoolsWithOpenApplications: results.filter(r => r.applicationStatus?.isOpen).length,
        errors: results.filter(r => !r.success).length,
        timestamp: new Date()
      };

      console.log('Weekly Report:', report);
      
      // Could send this report to administrators
      // await emailService.sendWeeklyReport(report);
      
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  }

  // Manual trigger for testing
  async triggerMonitoring() {
    console.log('Manually triggering school monitoring...');
    try {
      const results = await webMonitorService.monitorAllSchools();
      console.log('Manual monitoring completed:', results);
      return results;
    } catch (error) {
      console.error('Error in manual monitoring:', error);
      throw error;
    }
  }

  // Stop all scheduled jobs
  stopAllJobs() {
    console.log('Stopping all scheduled jobs...');
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${name}`);
    }
    this.jobs.clear();
    this.isInitialized = false;
  }

  // Get status of all jobs
  getJobStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running,
        nextDate: job.nextDate()
      };
    }
    return status;
  }
}

module.exports = new SchedulerService(); 