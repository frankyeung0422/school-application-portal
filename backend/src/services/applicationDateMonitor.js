const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');
const SchoolMonitor = require('../models/schoolMonitor.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const emailService = require('./emailService');

class ApplicationDateMonitor {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    // Keywords that indicate application opening
    this.applicationOpenKeywords = [
      'application open', 'applications open', 'admission open', 'admissions open',
      'enrollment open', 'enrollments open', 'registration open', 'registrations open',
      'apply now', 'apply online', 'start application', 'begin application',
      'application period', 'admission period', 'enrollment period',
      'accepting applications', 'accepting students', 'taking applications',
      'application form', 'admission form', 'enrollment form',
      '報名開始', '招生開始', '申請開始', '入學申請', '報名表格'
    ];
    
    // Keywords that indicate application closing
    this.applicationCloseKeywords = [
      'application closed', 'applications closed', 'admission closed', 'admissions closed',
      'enrollment closed', 'enrollments closed', 'registration closed', 'registrations closed',
      'no longer accepting', 'not accepting', 'application ended', 'admission ended',
      'enrollment ended', 'registration ended', 'application deadline passed',
      'admission deadline passed', 'enrollment deadline passed',
      '報名結束', '招生結束', '申請結束', '截止日期已過'
    ];
    
    // Date patterns to look for
    this.datePatterns = [
      // English date patterns
      /\b(?:application|admission|enrollment|registration)\s+(?:deadline|due date|closing date|end date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(?:deadline|due date|closing date|end date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(?:from|between)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      
      // Chinese date patterns
      /\b(?:報名|招生|申請|入學)\s+(?:截止日期|截止時間|結束日期)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(?:截止日期|截止時間|結束日期)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /\b(?:從|由)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:至|到)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      
      // Month/Year patterns
      /\b(?:application|admission|enrollment|registration)\s+(?:for|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
      /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\s+(?:application|admission|enrollment|registration)/gi
    ];
  }

  // Monitor application dates for a specific school
  async monitorApplicationDates(schoolNo) {
    try {
      const schoolMonitor = await SchoolMonitor.findOne({ schoolNo });
      if (!schoolMonitor || !schoolMonitor.isActive) {
        return { success: false, message: 'School not found or monitoring disabled' };
      }

      console.log(`Monitoring application dates for: ${schoolMonitor.schoolName} (${schoolNo})`);

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
      
      // Analyze content for application information
      const analysis = this.analyzeApplicationContent(content);
      
      // Check for changes in application status
      const hasApplicationStatusChanged = this.checkApplicationStatusChange(schoolMonitor, analysis);
      
      // Update school monitor with new information
      const updateData = {
        lastChecked: new Date(),
        successCount: schoolMonitor.successCount + 1,
        errorCount: 0,
        lastError: null
      };

      // Update application status if changed
      if (hasApplicationStatusChanged) {
        updateData['applicationStatus.isOpen'] = analysis.isOpen;
        updateData['applicationStatus.lastUpdated'] = new Date();
        updateData['applicationStatus.startDate'] = analysis.startDate;
        updateData['applicationStatus.endDate'] = analysis.endDate;
        updateData['applicationStatus.deadline'] = analysis.deadline;
        updateData['applicationStatus.requirements'] = analysis.requirements;
        updateData['applicationStatus.notes'] = analysis.notes;
        
        // Create notifications for interested users
        await this.createApplicationNotifications(schoolMonitor, analysis);
      }

      await SchoolMonitor.updateOne({ schoolNo }, updateData);

      return {
        success: true,
        hasChanged: hasApplicationStatusChanged,
        applicationStatus: analysis,
        message: hasApplicationStatusChanged ? 'Application status changed' : 'No changes detected'
      };

    } catch (error) {
      console.error(`Error monitoring application dates for school ${schoolNo}:`, error.message);
      
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
      // Default: extract text from application-related areas
      const applicationSelectors = [
        '.admission-info', '.application-info', '.enrollment-info',
        '.admission', '.application', '.enrollment', '.registration',
        '.admissions', '.applications', '.enrollments', '.registrations',
        'main', 'article', '.content', '.main-content'
      ];
      
      applicationSelectors.forEach(selector => {
        const element = $(selector);
        if (element.length > 0) {
          content += element.text().trim() + ' ';
        }
      });

      // If no application content found, get body text
      if (!content.trim()) {
        content = $('body').text().trim();
      }
    }

    return content.replace(/\s+/g, ' ').trim();
  }

  // Analyze content for application information
  analyzeApplicationContent(content) {
    const contentLower = content.toLowerCase();
    
    // Check for application open/close keywords
    const isOpen = this.checkApplicationOpen(contentLower);
    const isClosed = this.checkApplicationClosed(contentLower);
    
    // Extract dates
    const dates = this.extractDates(content);
    
    // Extract requirements
    const requirements = this.extractRequirements(content);
    
    // Determine application status
    let applicationStatus = 'unknown';
    if (isOpen && !isClosed) {
      applicationStatus = 'open';
    } else if (isClosed) {
      applicationStatus = 'closed';
    } else if (isOpen) {
      applicationStatus = 'open';
    }
    
    // Find the most relevant deadline
    const deadline = this.findMostRelevantDeadline(dates);
    
    // Extract start and end dates
    const { startDate, endDate } = this.extractStartEndDates(content, dates);
    
    // Generate notes
    const notes = this.generateNotes(content, isOpen, isClosed, dates);
    
    return {
      isOpen: applicationStatus === 'open',
      status: applicationStatus,
      startDate: startDate,
      endDate: endDate,
      deadline: deadline,
      dates: dates,
      requirements: requirements,
      notes: notes,
      confidence: this.calculateConfidence(content, isOpen, isClosed, dates)
    };
  }

  // Check if application is open
  checkApplicationOpen(content) {
    return this.applicationOpenKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
  }

  // Check if application is closed
  checkApplicationClosed(content) {
    return this.applicationCloseKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
  }

  // Extract dates from content
  extractDates(content) {
    const dates = [];
    
    this.datePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const extractedDates = this.parseDateFromMatch(match);
          dates.push(...extractedDates);
        });
      }
    });
    
    // Remove duplicates and sort
    return [...new Set(dates)].sort();
  }

  // Parse date from regex match
  parseDateFromMatch(match) {
    const dates = [];
    
    // Extract date groups from match
    const dateGroups = match.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
    if (dateGroups) {
      dateGroups.forEach(dateStr => {
        try {
          // Try different date formats
          const formats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY', 'MM-DD-YYYY'];
          for (const format of formats) {
            const date = moment(dateStr, format, true);
            if (date.isValid()) {
              dates.push(date.toDate());
              break;
            }
          }
        } catch (error) {
          // Skip invalid dates
        }
      });
    }
    
    return dates;
  }

  // Extract application requirements
  extractRequirements(content) {
    const requirements = [];
    const requirementKeywords = [
      'requirement', 'requirements', 'eligibility', 'criteria',
      'document', 'documents', 'certificate', 'certificates',
      '需要', '要求', '資格', '文件', '證書'
    ];
    
    const lines = content.split('\n');
    lines.forEach(line => {
      const lineLower = line.toLowerCase();
      if (requirementKeywords.some(keyword => lineLower.includes(keyword))) {
        const requirement = line.trim();
        if (requirement.length > 10 && requirement.length < 200) {
          requirements.push(requirement);
        }
      }
    });
    
    return requirements.slice(0, 5); // Limit to 5 requirements
  }

  // Find the most relevant deadline
  findMostRelevantDeadline(dates) {
    if (dates.length === 0) return null;
    
    const now = new Date();
    const futureDates = dates.filter(date => date > now);
    
    if (futureDates.length > 0) {
      // Return the earliest future date
      return futureDates[0];
    } else {
      // Return the latest date if all are in the past
      return dates[dates.length - 1];
    }
  }

  // Extract start and end dates from content and dates array
  extractStartEndDates(content, dates) {
    const contentLower = content.toLowerCase();
    let startDate = null;
    let endDate = null;
    
    // Look for date range patterns
    const dateRangePatterns = [
      // English patterns
      /(?:from|between|starting|beginning)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until|through|ending)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until|through)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      // Chinese patterns with different date formats
      /(?:從|由|開始於)\s*(\d{4}年\d{1,2}月\d{1,2}日?)\s*(?:至|到|結束於)\s*(\d{4}年\d{1,2}月\d{1,2}日?)/gi,
      /(\d{4}年\d{1,2}月\d{1,2}日?)\s*(?:至|到)\s*(\d{4}年\d{1,2}月\d{1,2}日?)/gi,
      /(?:從|由|開始於)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:至|到|結束於)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:至|到)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
    ];
    
    // Try to find date ranges in content
    for (const pattern of dateRangePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const dateGroups = match.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
          if (dateGroups && dateGroups.length >= 2) {
            const date1 = this.parseDateString(dateGroups[0]);
            const date2 = this.parseDateString(dateGroups[1]);
            
            if (date1 && date2) {
              // Assume the earlier date is start, later is end
              if (date1 < date2) {
                startDate = date1;
                endDate = date2;
              } else {
                startDate = date2;
                endDate = date1;
              }
              break;
            }
          }
        }
        if (startDate && endDate) break;
      }
    }
    
    // If no range found, try to infer from individual dates
    if (!startDate && !endDate && dates.length > 0) {
      const now = new Date();
      const futureDates = dates.filter(date => date > now).sort();
      const pastDates = dates.filter(date => date <= now).sort();
      
      if (futureDates.length >= 2) {
        // Multiple future dates - assume first is start, last is end
        startDate = futureDates[0];
        endDate = futureDates[futureDates.length - 1];
      } else if (futureDates.length === 1 && pastDates.length > 0) {
        // One future date and some past dates - assume past is start, future is end
        startDate = pastDates[pastDates.length - 1];
        endDate = futureDates[0];
      } else if (dates.length >= 2) {
        // Just use the first and last dates
        startDate = dates[0];
        endDate = dates[dates.length - 1];
      }
    }
    
    return { startDate, endDate };
  }

  // Parse a date string to Date object
  parseDateString(dateStr) {
    try {
      // Handle Chinese date format (YYYY年MM月DD日)
      const chineseDateMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
      if (chineseDateMatch) {
        const [, year, month, day] = chineseDateMatch;
        const date = moment(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, 'YYYY-MM-DD', true);
        if (date.isValid()) {
          return date.toDate();
        }
      }
      
      // Handle standard formats
      const formats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY', 'MM-DD-YYYY'];
      for (const format of formats) {
        const date = moment(dateStr, format, true);
        if (date.isValid()) {
          return date.toDate();
        }
      }
    } catch (error) {
      // Skip invalid dates
    }
    return null;
  }

  // Generate notes about the application
  generateNotes(content, isOpen, isClosed, dates) {
    const notes = [];
    
    if (isOpen) {
      notes.push('Application appears to be open');
    }
    
    if (isClosed) {
      notes.push('Application appears to be closed');
    }
    
    if (dates.length > 0) {
      notes.push(`Found ${dates.length} date(s) in content`);
    }
    
    if (content.length > 1000) {
      notes.push('Detailed application information available');
    }
    
    return notes.join('; ');
  }

  // Calculate confidence in the analysis
  calculateConfidence(content, isOpen, isClosed, dates) {
    let confidence = 0.5; // Base confidence
    
    if (isOpen || isClosed) confidence += 0.2;
    if (dates.length > 0) confidence += 0.2;
    if (content.length > 500) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Check if application status has changed
  checkApplicationStatusChange(schoolMonitor, newAnalysis) {
    const currentStatus = schoolMonitor.applicationStatus;
    
    // Check if open/closed status changed
    if (currentStatus.isOpen !== newAnalysis.isOpen) {
      return true;
    }
    
    // Check if deadline changed
    if (currentStatus.deadline && newAnalysis.deadline) {
      const currentDeadline = new Date(currentStatus.deadline);
      const newDeadline = new Date(newAnalysis.deadline);
      if (Math.abs(currentDeadline.getTime() - newDeadline.getTime()) > 24 * 60 * 60 * 1000) { // 1 day difference
        return true;
      }
    }
    
    return false;
  }

  // Create notifications for application status changes
  async createApplicationNotifications(schoolMonitor, analysis) {
    try {
      // Find users interested in this school
      const interestedUsers = await User.find({
        'interestedSchools.schoolNo': schoolMonitor.schoolNo,
        isActive: true
      });

      for (const user of interestedUsers) {
        let notificationType = 'application_update';
        let title = 'Application Update';
        let message = `Application information for ${schoolMonitor.schoolName} has been updated.`;
        let priority = 'medium';

        // Determine notification type and priority
        if (analysis.isOpen && !schoolMonitor.applicationStatus.isOpen) {
          notificationType = 'application_open';
          title = 'Applications Now Open!';
          message = `Applications for ${schoolMonitor.schoolName} are now open!`;
          priority = 'high';
        } else if (!analysis.isOpen && schoolMonitor.applicationStatus.isOpen) {
          notificationType = 'application_closed';
          title = 'Applications Closed';
          message = `Applications for ${schoolMonitor.schoolName} have closed.`;
          priority = 'medium';
        } else if (analysis.deadline && analysis.deadline !== schoolMonitor.applicationStatus.deadline) {
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
            applicationStatus: analysis.status,
            deadline: analysis.deadline,
            requirements: analysis.requirements,
            confidence: analysis.confidence
          }
        });

        await notification.save();

        // Send email notification if enabled
        if (user.notificationPreferences.email) {
          await emailService.sendApplicationNotification(user.email, {
            schoolName: schoolMonitor.schoolName,
            notificationType,
            title,
            message,
            deadline: analysis.deadline,
            websiteUrl: schoolMonitor.websiteUrl
          });
        }
      }

      console.log(`Created ${interestedUsers.length} notifications for ${schoolMonitor.schoolName}`);

    } catch (error) {
      console.error('Error creating application notifications:', error);
    }
  }

  // Monitor all schools for application date changes
  async monitorAllApplicationDates() {
    try {
      const activeSchools = await SchoolMonitor.find({ isActive: true });
      console.log(`Starting application date monitoring for ${activeSchools.length} schools...`);

      const results = [];
      for (const school of activeSchools) {
        const result = await this.monitorApplicationDates(school.schoolNo);
        results.push({
          schoolNo: school.schoolNo,
          schoolName: school.schoolName,
          ...result
        });

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      console.log('Application date monitoring completed:', results);
      return results;

    } catch (error) {
      console.error('Error in monitorAllApplicationDates:', error);
      throw error;
    }
  }

  // Analyze a public application page by URL (standalone, no DB)
  async analyzeApplicationPage(url) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 20000
      });
      const html = response.data;
      // Use default selectors for public analysis
      const content = this.extractRelevantContent(html, []);
      const analysis = this.analyzeApplicationContent(content);
      // Try to detect language (simple heuristic)
      const language = /[\u4e00-\u9fa5]/.test(content) ? 'Chinese' : 'English';
      return {
        url,
        status: analysis.status,
        isOpen: analysis.isOpen,
        openDate: analysis.dates && analysis.dates.length > 0 ? analysis.dates[0] : null,
        closeDate: analysis.deadline || null,
        requirements: analysis.requirements,
        notes: analysis.notes,
        confidence: analysis.confidence,
        language
      };
    } catch (error) {
      throw new Error(`Failed to analyze application page: ${error.message}`);
    }
  }
}

module.exports = ApplicationDateMonitor; 