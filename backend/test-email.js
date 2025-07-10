require('dotenv').config();
const emailService = require('./src/services/emailService');

async function testEmail() {
  console.log('🧪 Testing Email Configuration');
  console.log('==============================\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Missing'}`);
  console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing'}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅ Set' : '❌ Missing'}\n`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ Email configuration incomplete. Please run setup-email.js first.');
    return;
  }

  // Test email service initialization
  console.log('🔧 Testing email service initialization...');
  
  // Wait for service to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test sending a sample notification email
  const testNotification = {
    title: 'Test Notification',
    message: 'This is a test notification to verify email configuration.',
    type: 'website_update',
    priority: 'medium',
    schoolName: 'Test School',
    schoolNo: 'TEST001',
    metadata: {
      websiteUrl: 'https://example.com'
    }
  };

  console.log('📤 Sending test notification email...');
  
  try {
    const result = await emailService.sendNotificationEmail(process.env.EMAIL_USER, testNotification);
    console.log('✅ Test notification email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log('\n📧 Check your email inbox for the test notification.');
  } catch (error) {
    console.log('❌ Failed to send test notification email:');
    console.log(error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your Gmail App Password is correct');
      console.log('2. Make sure 2-Factor Authentication is enabled');
      console.log('3. Verify the App Password was generated for "Mail"');
    }
  }

  console.log('\n🎯 Email configuration test completed!');
}

testEmail().catch(console.error); 