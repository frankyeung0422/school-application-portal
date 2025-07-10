# 📧 Email Configuration Setup Guide

This guide will help you set up Gmail SMTP for the School Portal notification system.

## 🎯 Quick Setup (Recommended)

### Step 1: Run the Setup Script
```bash
cd backend
node setup-email.js
```

This interactive script will:
- Guide you through Gmail App Password setup
- Create the `.env` file with proper configuration
- Test the email configuration
- Provide next steps

### Step 2: Test the Configuration
```bash
node test-email.js
```

## 🔧 Manual Setup

### Step 1: Enable Gmail 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification**

### Step 2: Generate App Password
1. In Security settings, find **App passwords** (under 2-Step Verification)
2. Click **App passwords**
3. Select **Mail** as the app and **Other** as the device
4. Enter **"School Portal"** as the name
5. Click **Generate**
6. **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)

### Step 3: Create .env File
Create a file named `.env` in the `backend` folder:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/school-portal

# Server Configuration
PORT=5000
NODE_ENV=development

# Gmail SMTP Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-gmail@gmail.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5008

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Step 4: Test Configuration
```bash
node test-email.js
```

## 🧪 Testing Email Configuration

### Method 1: Using the Test Script
```bash
node test-email.js
```

### Method 2: Using the API Endpoint
```bash
curl -X POST http://localhost:5000/api/monitoring/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Method 3: Using the Frontend
1. Start the backend server: `npm start`
2. Start the frontend: `cd ../frontend && npm start`
3. Navigate to the monitoring section
4. Use the test email feature

## 🔍 Troubleshooting

### Common Issues

#### 1. "Invalid login" Error
- **Cause**: Incorrect App Password
- **Solution**: Generate a new App Password and update `.env`

#### 2. "Less secure app access" Error
- **Cause**: 2-Factor Authentication not enabled
- **Solution**: Enable 2-Factor Authentication first

#### 3. "Username and Password not accepted" Error
- **Cause**: Using regular Gmail password instead of App Password
- **Solution**: Use the 16-character App Password

#### 4. "Connection timeout" Error
- **Cause**: Network or firewall issues
- **Solution**: Check internet connection and firewall settings

### Debug Steps
1. Verify `.env` file exists and has correct values
2. Check Gmail App Password is exactly 16 characters
3. Ensure 2-Factor Authentication is enabled
4. Test with a simple email client first
5. Check server logs for detailed error messages

## 📧 Email Templates

The system includes several email templates:

### 1. Notification Emails
- **Application Open**: When school applications become available
- **Application Closed**: When application periods end
- **Website Updates**: When school websites change
- **Deadline Reminders**: When deadlines are approaching

### 2. Welcome Emails
- Sent to new users upon registration
- Includes platform features and getting started guide

### 3. Test Emails
- Simple test emails to verify configuration
- Include timestamp and configuration status

## 🔒 Security Best Practices

### For Development
- Use a dedicated Gmail account for testing
- Keep App Passwords secure and don't commit to version control
- Use environment variables for all sensitive data

### For Production
- Use a professional email service (SendGrid, AWS SES, etc.)
- Implement email rate limiting
- Add email verification for user accounts
- Use proper SSL/TLS encryption
- Monitor email delivery rates

## 📋 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `EMAIL_USER` | Gmail address | Yes | - |
| `EMAIL_PASSWORD` | Gmail App Password | Yes | - |
| `EMAIL_FROM` | From email address | No | `EMAIL_USER` |
| `FRONTEND_URL` | Frontend URL for email links | No | `http://localhost:5008` |
| `MONGODB_URI` | MongoDB connection string | No | `mongodb://localhost:27017/school-portal` |
| `PORT` | Server port | No | `5000` |
| `JWT_SECRET` | JWT signing secret | No | Auto-generated |

## 🚀 Next Steps

After successful email configuration:

1. **Start the Backend Server**:
   ```bash
   npm start
   ```

2. **Initialize Monitoring System**:
   ```bash
   node src/scripts/initializeMonitoring.js
   ```

3. **Start the Frontend**:
   ```bash
   cd ../frontend
   npm start
   ```

4. **Test the Full System**:
   - Register a user account
   - Add schools to your interested list
   - Trigger manual monitoring
   - Check for email notifications

## 📚 Additional Resources

- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [School Portal Notification System](NOTIFICATION_SYSTEM.md)

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all environment variables are set correctly
4. Test with a simple email client first
5. Check Gmail account settings and App Password validity

For additional support, refer to the main documentation in `NOTIFICATION_SYSTEM.md`. 