const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const SchoolMonitor = require('../models/schoolMonitor.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const emailService = require('./emailService');
const ApplicationDateMonitor = require('./applicationDateMonitor');

class WebMonitorService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.applicationDateMonitor = new ApplicationDateMonitor();
  }

  // Generate hash for content comparison
  generateContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Extract relevant content from HTML
  extractRelevantContent(html, selectors = []) {
    const $ = cheerio.load(html);
    let content = '';

    // Remove script and style elements
    $('script, style').remove();

    // If specific selectors are provided, use them
    if (selectors.length > 0) {
      selectors.forEach(selector => {
        const element = $(selector);
        if (element.length > 0) {
          content += element.text().trim() + ' ';
        }
      });
    } else {
      // Default: extract text from main content areas
      const mainSelectors = [
        'main', 'article', '.content', '.main-content', 
        '#content', '#main', '.application-info', '.admission-info',
        '.news', '.announcement', '.notice', '.update'
      ];
      
      mainSelectors.forEach(selector => {
        const element = $(selector);
        if (element.length > 0) {
          content += element.text().trim() + ' ';
        }
      });

      // If no main content found, get body text
      if (!content.trim()) {
        content = $('body').text().trim();
      }
    }

    return content.replace(/\s+/g, ' ').trim();
  }

  // Check application status using keywords
  checkApplicationStatus(content) {
    const contentLower = content.toLowerCase();
    
    const openKeywords = [
      'application open', 'applications open', 'admission open', 'admissions open',
      'enrollment open', 'enrollments open', 'registration open', 'registrations open',
      'apply now', 'apply online', 'start application', 'begin application',
      'accepting applications', 'accepting students', 'taking applications',
      '報名開始', '招生開始', '申請開始', '入學申請'
    ];
    
    const closedKeywords = [
      'application closed', 'applications closed', 'admission closed', 'admissions closed',
      'enrollment closed', 'enrollments closed', 'registration closed', 'registrations closed',
      'no longer accepting', 'not accepting', 'application ended', 'admission ended',
      'enrollment ended', 'registration ended', 'application deadline passed',
      '報名結束', '招生結束', '申請結束', '截止日期已過'
    ];

    const isOpen = openKeywords.some(keyword => contentLower.includes(keyword));
    const isClosed = closedKeywords.some(keyword => contentLower.includes(keyword));

    return {
      isOpen: isOpen && !isClosed,
      confidence: isOpen || isClosed ? 0.8 : 0.3
    };
  }

  // Check for application-related keywords
  checkApplicationKeywords(content) {
    const contentLower = content.toLowerCase();
    const keywords = [
      'application', 'admission', 'enrollment', 'registration',
      'apply', 'applications open', 'admissions open',
      'deadline', 'due date', 'closing date',
      '報名', '招生', '申請', '入學', '截止日期'
    ];

    return keywords.filter(keyword => contentLower.includes(keyword));
  }

  // Extract deadlines from content
  extractDeadlines(content) {
    const deadlines = [];
    
    // Date patterns
    const datePatterns = [
      /\b(?:application|admission|enrollment|registration)\s+(?:deadline|due date|closing date|end date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(?:deadline|due date|closing date|end date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(?:from|between)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
    ];

    datePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const dateMatch = match.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
          if (dateMatch) {
            deadlines.push(dateMatch[1]);
          }
        });
      }
    });

    return [...new Set(deadlines)]; // Remove duplicates
  }

  // Monitor a single school website with enhanced application date monitoring
  async monitorSchool(schoolNo) {
    try {
      const schoolMonitor = await SchoolMonitor.findOne({ schoolNo });
      if (!schoolMonitor || !schoolMonitor.isActive) {
        return { success: false, message: 'School not found or monitoring disabled' };
      }

      console.log(`Monitoring school: ${schoolMonitor.schoolName} (${schoolNo})`);

      // Fetch website content
      const response = await axios.get(schoolMonitor.websiteUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      const html = response.data;
      const content = this.extractRelevantContent(html, schoolMonitor.monitoringConfig.contentSelectors);
      const contentHash = this.generateContentHash(content);

      // Check if content has changed
      const hasChanged = schoolMonitor.lastContentHash && schoolMonitor.lastContentHash !== contentHash;
      
      // Enhanced application status checking
      const applicationStatus = this.checkApplicationStatus(content);
      const keywords = this.checkApplicationKeywords(content);
      const deadlines = this.extractDeadlines(content);

      // Use application date monitor for more detailed analysis
      const detailedAnalysis = this.applicationDateMonitor.analyzeApplicationContent(content);
      
      // Check for application status changes
      const hasApplicationStatusChanged = this.applicationDateMonitor.checkApplicationStatusChange(schoolMonitor, detailedAnalysis);

      // Update school monitor
      const updateData = {
        lastChecked: new Date(),
        lastContentHash: contentHash,
        lastContent: content,
        successCount: schoolMonitor.successCount + 1,
        errorCount: 0,
        lastError: null
      };

      // Update application status if changed
      if (hasApplicationStatusChanged) {
        updateData['applicationStatus.isOpen'] = detailedAnalysis.isOpen;
        updateData['applicationStatus.lastUpdated'] = new Date();
        updateData['applicationStatus.deadline'] = detailedAnalysis.deadline;
        updateData['applicationStatus.requirements'] = detailedAnalysis.requirements;
        updateData['applicationStatus.notes'] = detailedAnalysis.notes;
        
        // Create notifications for interested users
        await this.createNotifications(schoolMonitor, {
          hasChanged,
          applicationStatus: detailedAnalysis,
          keywords,
          deadlines,
          content
        });
      }

      await SchoolMonitor.updateOne({ schoolNo }, updateData);

      return {
        success: true,
        hasChanged,
        applicationStatus: detailedAnalysis,
        keywords: keywords.length,
        deadlines: deadlines.length,
        confidence: detailedAnalysis.confidence
      };

    } catch (error) {
      console.error(`Error monitoring school ${schoolNo}:`, error.message);
      
      // Update error count
      await SchoolMonitor.updateOne(
        { schoolNo },
        {
          lastChecked: new Date(),
          errorCount: (schoolMonitor?.errorCount || 0) + 1,
          lastError: error.message
        }
      );

      return { success: false, error: error.message };
    }
  }

  // Create notifications for interested users
  async createNotifications(schoolMonitor, changes) {
    try {
      // Find users interested in this school
      const interestedUsers = await User.find({
        'interestedSchools.schoolNo': schoolMonitor.schoolNo,
        isActive: true
      });

      for (const user of interestedUsers) {
        let notificationType = 'website_update';
        let title = 'Website Update';
        let message = `The website for ${schoolMonitor.schoolName} has been updated.`;
        let priority = 'medium';

        // Check for application status changes
        if (changes.applicationStatus.isOpen && !schoolMonitor.applicationStatus.isOpen) {
          notificationType = 'application_open';
          title = 'Application Now Open!';
          message = `Applications for ${schoolMonitor.schoolName} are now open!`;
          priority = 'high';
        } else if (!changes.applicationStatus.isOpen && schoolMonitor.applicationStatus.isOpen) {
          notificationType = 'application_closed';
          title = 'Application Closed';
          message = `Applications for ${schoolMonitor.schoolName} have closed.`;
          priority = 'medium';
        } else if (changes.applicationStatus.deadline && changes.applicationStatus.deadline !== schoolMonitor.applicationStatus.deadline) {
          notificationType = 'deadline_update';
          title = 'Application Deadline Updated';
          message = `The application deadline for ${schoolMonitor.schoolName} has been updated.`;
          priority = 'high';
        }

        // Create notification record
        const notification = new Notification({
          userId: user._id,
          schoolNo: schoolMonitor.schoolNo,
          schoolName: schoolMonitor.schoolName,
          type: notificationType,
          title,
          message,
          priority,
          deliveryMethod: user.notificationPreferences.email ? ['email'] : [],
          metadata: {
            websiteUrl: schoolMonitor.websiteUrl,
            changeDetected: changes.hasChanged ? 'content' : 'status',
            previousContent: schoolMonitor.lastContent,
            newContent: changes.content,
            applicationStatus: changes.applicationStatus.status,
            deadline: changes.applicationStatus.deadline,
            confidence: changes.applicationStatus.confidence
          }
        });

        await notification.save();

        // Send email notification if enabled
        if (user.notificationPreferences.email) {
          await emailService.sendNotification(user.email, {
            schoolName: schoolMonitor.schoolName,
            notificationType,
            title,
            message,
            websiteUrl: schoolMonitor.websiteUrl,
            deadline: changes.applicationStatus.deadline
          });
        }
      }

      console.log(`Created ${interestedUsers.length} notifications for ${schoolMonitor.schoolName}`);

    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  }

  // Monitor all active schools
  async monitorAllSchools() {
    try {
      const activeSchools = await SchoolMonitor.find({ isActive: true });
      console.log(`Starting to monitor ${activeSchools.length} schools...`);

      const results = [];
      for (const school of activeSchools) {
        const result = await this.monitorSchool(school.schoolNo);
        results.push({
          schoolNo: school.schoolNo,
          schoolName: school.schoolName,
          ...result
        });

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('Monitoring completed:', results);
      return results;

    } catch (error) {
      console.error('Error in monitorAllSchools:', error);
      throw error;
    }
  }

  // Monitor application dates specifically
  async monitorApplicationDates(schoolNo) {
    return await this.applicationDateMonitor.monitorApplicationDates(schoolNo);
  }

  // Monitor all schools for application dates
  async monitorAllApplicationDates() {
    return await this.applicationDateMonitor.monitorAllApplicationDates();
  }

  // Get monitoring statistics
  async getMonitoringStats() {
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
            avgSuccess: { $avg: '$successCount' },
            withRealWebsites: { $sum: { $cond: ['$hasRealWebsite', 1, 0] } },
            verifiedWebsites: { $sum: { $cond: ['$websiteVerified', 1, 0] } }
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
        .select('schoolNo schoolName lastChecked errorCount successCount applicationStatus.isOpen');

      return {
        overall: stats[0] || { 
          total: 0, active: 0, inactive: 0, totalErrors: 0, totalSuccess: 0, 
          avgErrors: 0, avgSuccess: 0, withRealWebsites: 0, verifiedWebsites: 0 
        },
        byApplicationStatus: applicationStatusStats,
        recentActivity
      };

    } catch (error) {
      console.error('Error getting monitoring stats:', error);
      throw error;
    }
  }
}

module.exports = WebMonitorService; 