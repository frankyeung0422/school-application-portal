# School Website Monitoring & Application Date Tracking

## Overview

The school application portal now includes comprehensive website monitoring and application date tracking capabilities. This system automatically monitors school websites for changes in application status, deadlines, and other important updates.

## Features Implemented

### 1. School Website Search & Verification
- **Automated Website Discovery**: Searches for official school websites using multiple methods
- **Website Verification**: Distinguishes between real and placeholder websites
- **Multiple Search Sources**: Google, Bing, EDB (Education Bureau), and direct domain testing
- **Confidence Scoring**: Ranks search results by relevance and accuracy

### 2. Application Date Monitoring
- **Real-time Monitoring**: Tracks changes in application status (open/closed)
- **Deadline Detection**: Automatically extracts and monitors application deadlines
- **Content Analysis**: Uses AI-powered text analysis to detect application-related information
- **Multi-language Support**: Detects application information in both English and Chinese

### 3. Enhanced School Cards
- **Website Information**: Displays official website links with verification status
- **Application Status**: Shows current application status with visual indicators
- **Deadline Display**: Shows application deadlines when available
- **Smart Buttons**: Different button states based on application availability

### 4. Notification System
- **Instant Alerts**: Notifies users when applications open/close
- **Deadline Reminders**: Alerts users about upcoming deadlines
- **Email Notifications**: Sends email alerts for important changes
- **Multiple Notification Types**: Application open, closed, deadline updates, website changes

## Technical Implementation

### Backend Services

#### 1. SchoolWebsiteSearcher (`src/scripts/searchSchoolWebsites.js`)
```javascript
// Searches for school websites using multiple methods
const searcher = new SchoolWebsiteSearcher();
const results = await searcher.searchAllSchoolWebsites();
```

**Features:**
- Direct domain testing
- Google/Bing search integration
- EDB website scraping
- Content validation
- Confidence scoring

#### 2. ApplicationDateMonitor (`src/services/applicationDateMonitor.js`)
```javascript
// Monitors application dates and status changes
const monitor = new ApplicationDateMonitor();
const result = await monitor.monitorApplicationDates(schoolNo);
```

**Features:**
- Keyword-based application status detection
- Date pattern recognition
- Requirement extraction
- Change detection algorithms
- Notification triggering

#### 3. Enhanced WebMonitorService (`src/services/webMonitorService.js`)
```javascript
// Enhanced monitoring with application date integration
const webMonitor = new WebMonitorService();
const result = await webMonitor.monitorSchool(schoolNo);
```

**Features:**
- Content hash comparison
- Application status analysis
- Deadline extraction
- Notification creation
- Statistics tracking

### Frontend Enhancements

#### 1. Updated School Cards
- Application status badges (Open/Closed)
- Website verification indicators
- Deadline display
- Smart apply buttons

#### 2. Enhanced Styling
- Status badges with color coding
- Verification indicators
- Responsive design
- Hover effects

## API Endpoints

### Monitoring Routes (`/api/monitoring`)

#### Get All Monitored Schools
```
GET /api/monitoring/schools?status=active&hasWebsite=true
```

#### Application Status Summary
```
GET /api/monitoring/application-status
```

#### Schools with Open Applications
```
GET /api/monitoring/open-applications
```

#### Schools with Upcoming Deadlines
```
GET /api/monitoring/upcoming-deadlines
```

#### Manual Monitoring Triggers
```
POST /api/monitoring/monitor-all
POST /api/monitoring/monitor-all-application-dates
POST /api/monitoring/schools/:schoolNo/monitor
POST /api/monitoring/schools/:schoolNo/monitor-application-dates
```

#### Website Testing
```
POST /api/monitoring/test-website/:schoolNo
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Update School Websites
```bash
npm run update-websites
```

### 3. Initialize Monitoring System
```bash
npm run init-monitoring
```

### 4. Test Monitoring
```bash
# Test all schools
npm run monitor-all

# Test application date monitoring
npm run monitor-application-dates
```

## Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/school-portal
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Monitoring Configuration
Each school can be configured with:
- **Keywords**: Words to look for in content
- **Exclude Keywords**: Words to ignore
- **Content Selectors**: CSS selectors for specific content areas
- **Check Frequency**: How often to monitor (hourly/daily/weekly)

## Data Structure

### School Monitor Model
```javascript
{
  schoolNo: String,
  schoolName: String,
  websiteUrl: String,
  applicationPageUrl: String,
  isActive: Boolean,
  hasRealWebsite: Boolean,
  websiteVerified: Boolean,
  applicationStatus: {
    isOpen: Boolean,
    lastUpdated: Date,
    deadline: Date,
    requirements: [String],
    notes: String
  },
  monitoringConfig: {
    keywords: [String],
    excludeKeywords: [String],
    contentSelectors: [String],
    checkForChanges: Boolean,
    checkForDeadlines: Boolean,
    checkForApplicationStatus: Boolean
  }
}
```

## Monitoring Schedule

The system runs automated monitoring jobs:

- **Daily Monitoring**: 9:00 AM - Checks all active schools
- **Application Date Monitoring**: 10:00 AM - Focuses on application status changes
- **Weekly Monitoring**: Sunday 10:00 AM - Comprehensive monitoring and reporting
- **Notification Processing**: Every hour - Processes pending notifications

## Notification Types

### Application Status Changes
- `application_open`: Applications are now open
- `application_closed`: Applications have closed
- `deadline_update`: Application deadline has been updated

### Website Changes
- `website_update`: General website updates
- `content_change`: Significant content changes detected

## Error Handling

### Website Connectivity
- Timeout handling (30 seconds)
- Retry mechanisms
- Error logging and reporting
- Graceful degradation

### Content Analysis
- Invalid date handling
- Missing content handling
- Confidence scoring for uncertain results

## Performance Considerations

### Rate Limiting
- 2-3 second delays between requests
- Batch processing for large datasets
- Respectful crawling practices

### Caching
- Content hash comparison
- Last checked timestamps
- Incremental updates

## Security Features

### Request Headers
- User-Agent spoofing
- Accept headers
- Timeout limits
- Error handling

### Data Validation
- URL validation
- Content sanitization
- Input validation

## Troubleshooting

### Common Issues

#### 1. Website Not Found
- Check if the school has a real website
- Verify the URL format
- Test connectivity manually

#### 2. Application Status Not Detected
- Check monitoring configuration
- Verify content selectors
- Review keyword lists

#### 3. Notifications Not Sending
- Check email configuration
- Verify user notification preferences
- Check notification queue

### Debug Commands
```bash
# Test specific school
curl -X POST http://localhost:5000/api/monitoring/schools/0001/monitor

# Test website connectivity
curl -X POST http://localhost:5000/api/monitoring/test-website/0001

# Get monitoring stats
curl http://localhost:5000/api/monitoring/stats
```

## Future Enhancements

### Planned Features
1. **Machine Learning**: Improve content analysis accuracy
2. **Social Media Monitoring**: Track school social media for updates
3. **SMS Notifications**: Add SMS alert capabilities
4. **Advanced Analytics**: Detailed monitoring statistics and trends
5. **API Integration**: Connect with school management systems

### Scalability Improvements
1. **Distributed Monitoring**: Multiple monitoring servers
2. **Database Optimization**: Indexing and query optimization
3. **Caching Layer**: Redis integration for better performance
4. **Load Balancing**: Handle increased monitoring load

## Support

For technical support or questions about the monitoring system:
1. Check the troubleshooting section
2. Review the API documentation
3. Check server logs for error details
4. Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0 