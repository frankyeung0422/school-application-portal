const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Gmail SMTP configuration
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    if (!emailUser || !emailPassword) {
      console.warn('Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Email service configuration failed:', error.message);
      console.log('Please check your Gmail credentials and App Password');
    }
  }

  async sendNotificationEmail(userEmail, notification) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `[School Portal] ${notification.title}`,
        html: this.generateNotificationEmailHTML(notification),
        text: this.generateNotificationEmailText(notification)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Notification email sent to ${userEmail}:`, result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Error sending notification email:', error.message);
      throw error;
    }
  }

  generateNotificationEmailHTML(notification) {
    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };

    const typeIcons = {
      application_open: '🎉',
      application_closed: '🔒',
      website_update: '📝',
      deadline_reminder: '⏰'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>School Portal Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; }
          .priority-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; color: white; font-size: 12px; font-weight: bold; }
          .school-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .action-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding: 20px; background: #f8f9fa; }
          .info-box { padding: 15px; border-radius: 5px; margin: 20px 0; }
          .info-box.success { background: #d4edda; border: 1px solid #c3e6cb; }
          .info-box.warning { background: #fff3cd; border: 1px solid #ffeaa7; }
          .info-box.danger { background: #f8d7da; border: 1px solid #f5c6cb; }
          .info-box.info { background: #e2e3e5; border: 1px solid #d6d8db; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${typeIcons[notification.type] || '📢'} ${notification.title}</h1>
            <p>School Application Portal</p>
          </div>
          
          <div class="content">
            <div class="priority-badge" style="background-color: ${priorityColors[notification.priority]}">
              ${notification.priority.toUpperCase()}
            </div>
            
            <h2>${notification.message}</h2>
            
            <div class="school-info">
              <h3>🏫 ${notification.schoolName}</h3>
              <p><strong>School Number:</strong> ${notification.schoolNo}</p>
              ${notification.metadata?.websiteUrl ? `<p><strong>Website:</strong> <a href="${notification.metadata.websiteUrl}" target="_blank">${notification.metadata.websiteUrl}</a></p>` : ''}
            </div>
            
            ${this.getNotificationSpecificContent(notification)}
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5008'}/kindergartens/${notification.schoolNo}" class="action-button">
              View School Details
            </a>
            
            <div class="footer">
              <p>This notification was sent by the School Application Portal.</p>
              <p>You can manage your notification preferences in your account settings.</p>
              <p>© 2024 School Application Portal. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNotificationEmailText(notification) {
    return `
${notification.title}
================================

${notification.message}

School: ${notification.schoolName}
School Number: ${notification.schoolNo}
Priority: ${notification.priority.toUpperCase()}

${this.getNotificationSpecificContentText(notification)}

View School Details: ${process.env.FRONTEND_URL || 'http://localhost:5008'}/kindergartens/${notification.schoolNo}

---
This notification was sent by the School Application Portal.
You can manage your notification preferences in your account settings.
    `.trim();
  }

  getNotificationSpecificContent(notification) {
    switch (notification.type) {
      case 'application_open':
        return `
          <div class="info-box success">
            <h4 style="color: #155724; margin: 0 0 10px 0;">🎯 Application Now Open!</h4>
            <p style="color: #155724; margin: 0;">The application period for this school has started. Don't miss this opportunity!</p>
          </div>
        `;
      
      case 'application_closed':
        return `
          <div class="info-box danger">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">⚠️ Application Period Ended</h4>
            <p style="color: #721c24; margin: 0;">The application period for this school has closed. Check back later for future opportunities.</p>
          </div>
        `;
      
      case 'deadline_reminder':
        return `
          <div class="info-box warning">
            <h4 style="color: #856404; margin: 0 0 10px 0;">⏰ Deadline Approaching</h4>
            <p style="color: #856404; margin: 0;">The application deadline is approaching. Make sure to submit your application on time!</p>
          </div>
        `;
      
      default:
        return `
          <div class="info-box info">
            <h4 style="color: #383d41; margin: 0 0 10px 0;">📝 Website Update</h4>
            <p style="color: #383d41; margin: 0;">The school's website has been updated with new information. Check the latest details.</p>
          </div>
        `;
    }
  }

  getNotificationSpecificContentText(notification) {
    switch (notification.type) {
      case 'application_open':
        return 'The application period for this school has started. Don\'t miss this opportunity!';
      case 'application_closed':
        return 'The application period for this school has closed. Check back later for future opportunities.';
      case 'deadline_reminder':
        return 'The application deadline is approaching. Make sure to submit your application on time!';
      default:
        return 'The school\'s website has been updated with new information. Check the latest details.';
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Welcome to School Application Portal!',
        html: this.generateWelcomeEmailHTML(userName),
        text: this.generateWelcomeEmailText(userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${userEmail}:`, result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Error sending welcome email:', error.message);
      throw error;
    }
  }

  generateWelcomeEmailHTML(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to School Portal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; }
          .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
          .action-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding: 20px; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to School Application Portal!</h1>
            <p>Your journey to finding the perfect school starts here</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to the School Application Portal! We're excited to help you find and apply to the best schools for your child.</p>
            
            <div class="feature">
              <h3>🔍 Browse Schools</h3>
              <p>Explore our comprehensive database of schools with detailed information, photos, and reviews.</p>
            </div>
            
            <div class="feature">
              <h3>🔔 Get Notifications</h3>
              <p>Stay updated with application deadlines, school updates, and new opportunities.</p>
            </div>
            
            <div class="feature">
              <h3>📝 Easy Applications</h3>
              <p>Submit applications directly through our platform with pre-filled forms and progress tracking.</p>
            </div>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5008'}" class="action-button">
              Start Exploring Schools
            </a>
            
            <div class="footer">
              <p>Thank you for choosing School Application Portal!</p>
              <p>© 2024 School Application Portal. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateWelcomeEmailText(userName) {
    return `
Welcome to School Application Portal!
====================================

Hello ${userName}!

Welcome to the School Application Portal! We're excited to help you find and apply to the best schools for your child.

What you can do:
- Browse our comprehensive database of schools
- Get notifications about application deadlines and updates
- Submit applications directly through our platform
- Track your application progress

Start exploring: ${process.env.FRONTEND_URL || 'http://localhost:5008'}

Thank you for choosing School Application Portal!

© 2024 School Application Portal. All rights reserved.
    `.trim();
  }

  // Test email function
  async sendTestEmail(toEmail) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Test Email - School Portal Notification System',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email to verify that the School Portal notification system is working correctly.</p>
          <p>If you received this email, the email configuration is successful!</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
        `,
        text: 'Test email from School Portal notification system'
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Test email sent successfully to ${toEmail}:`, result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error sending test email:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService(); 