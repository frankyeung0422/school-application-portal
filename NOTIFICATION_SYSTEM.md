# School Application Portal - Notification System

## Overview

The School Application Portal now includes a comprehensive notification system that monitors school websites for application updates and alerts users about important changes. This system helps parents stay informed about application deadlines, school updates, and new opportunities.

## Features

### 🔍 Website Monitoring
- **Automatic Monitoring**: The system automatically monitors school websites for changes
- **Content Analysis**: Detects application-related keywords and status changes
- **Change Detection**: Identifies when school websites are updated with new information
- **Deadline Tracking**: Extracts and tracks application deadlines

### 🔔 Smart Notifications
- **Real-time Alerts**: Get notified immediately when applications open or close
- **Email Notifications**: Receive detailed email alerts with school information
- **Push Notifications**: Browser-based notifications for instant updates
- **Customizable Frequency**: Choose between immediate, daily, or weekly notifications

### 👤 User Management
- **Interested Schools**: Users can select which schools to monitor
- **Notification Preferences**: Customize how and when to receive notifications
- **Profile Management**: Manage personal information and children profiles

## System Architecture

### Backend Components

#### Models
- **User Model** (`user.model.js`): Stores user information and notification preferences
- **Notification Model** (`notification.model.js`): Tracks notification records and status
- **School Monitor Model** (`schoolMonitor.model.js`): Manages website monitoring data

#### Services
- **Web Monitor Service** (`webMonitorService.js`): Handles website scraping and change detection
- **Email Service** (`emailService.js`): Sends notification emails
- **Scheduler Service** (`schedulerService.js`): Manages automated monitoring jobs

#### API Routes
- **Users** (`/api/users`): User management and authentication
- **Notifications** (`/api/notifications`): Notification management
- **Monitoring** (`/api/monitoring`): School monitoring management

### Frontend Components

#### Core Components
- **NotificationBell**: Shows unread notifications count and dropdown
- **InterestedSchools**: Manages school monitoring preferences
- **UserProfile**: Enhanced profile with notification settings

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Email service (Gmail, SendGrid, etc.)

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file based on `env.example`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/school-portal
   PORT=5000
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=noreply@schoolportal.com
   FRONTEND_URL=http://localhost:5008
   ```

3. **Initialize Database**
   ```bash
   node src/scripts/initializeMonitoring.js
   ```

4. **Start Backend**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Frontend**
   ```bash
   npm start
   ```

## API Endpoints

### User Management
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user profile
- `PATCH /api/users/:userId/notification-preferences` - Update notification preferences

### Interested Schools
- `GET /api/users/:userId/interested-schools` - Get user's interested schools
- `POST /api/users/:userId/interested-schools` - Add school to interested list
- `DELETE /api/users/:userId/interested-schools/:schoolNo` - Remove school from interested list

### Notifications
- `GET /api/notifications/user/:userId` - Get user's notifications
- `PATCH /api/notifications/:notificationId/read` - Mark notification as read
- `PATCH /api/notifications/user/:userId/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:notificationId` - Delete notification
- `GET /api/notifications/user/:userId/stats` - Get notification statistics

### Monitoring Management
- `GET /api/monitoring/schools` - Get all monitored schools
- `POST /api/monitoring/schools` - Add school to monitoring
- `PUT /api/monitoring/schools/:schoolNo` - Update school monitoring
- `POST /api/monitoring/monitor-all` - Manually trigger monitoring
- `GET /api/monitoring/stats` - Get monitoring statistics

## Monitoring Schedule

The system runs automated monitoring jobs:

- **Daily Monitoring**: 9:00 AM - Checks all active schools
- **Weekly Monitoring**: Sunday 10:00 AM - Comprehensive monitoring and reporting
- **Notification Processing**: Every hour - Processes pending notifications
- **Deadline Reminders**: 8:00 AM daily - Checks for upcoming deadlines

## Email Configuration

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in your `.env` file

### SendGrid Setup (Alternative)
1. Create a SendGrid account
2. Get your API key
3. Update the email service configuration

## Customization

### Adding New Schools
1. Add school to the monitoring system via API
2. Configure website URLs and monitoring parameters
3. Set up content selectors for specific information extraction

### Notification Types
The system supports these notification types:
- `application_open` - Applications are now open
- `application_closed` - Applications have closed
- `website_update` - General website updates
- `deadline_reminder` - Approaching deadlines

### Monitoring Configuration
Each school can be configured with:
- **Keywords**: Words to look for in content
- **Exclude Keywords**: Words to ignore
- **Content Selectors**: CSS selectors for specific content areas
- **Check Frequency**: How often to monitor (hourly, daily, weekly)

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check email credentials in `.env`
   - Verify email service configuration
   - Check firewall/network settings

2. **Monitoring Not Working**
   - Verify MongoDB connection
   - Check school website URLs
   - Review monitoring logs

3. **Notifications Not Appearing**
   - Check user authentication
   - Verify notification preferences
   - Review notification processing logs

### Logs
Monitor the backend console for:
- Monitoring job execution
- Email sending status
- Error messages and debugging information

## Security Considerations

- Passwords are hashed using SHA-256
- Email tokens for password reset
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure MongoDB connection

## Future Enhancements

- **SMS Notifications**: Add SMS support for urgent notifications
- **Mobile App**: Native mobile application
- **Advanced Analytics**: Detailed monitoring statistics
- **Machine Learning**: Improved content analysis
- **Multi-language Support**: Support for multiple languages
- **Social Media Integration**: Share updates on social platforms

## Support

For technical support or questions about the notification system, please refer to the project documentation or contact the development team. 