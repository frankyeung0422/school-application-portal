const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎯 School Portal - Email Configuration Setup');
console.log('============================================\n');

console.log('This script will help you configure Gmail SMTP for the notification system.\n');

console.log('📋 Prerequisites:');
console.log('1. Gmail account with 2-Factor Authentication enabled');
console.log('2. App Password generated for this application');
console.log('3. MongoDB running locally or accessible\n');

console.log('🔗 How to get Gmail App Password:');
console.log('1. Go to https://myaccount.google.com/');
console.log('2. Navigate to Security > 2-Step Verification');
console.log('3. Click "App passwords"');
console.log('4. Select "Mail" and "Other"');
console.log('5. Enter "School Portal" as the name');
console.log('6. Copy the 16-character password\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  try {
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    const envExists = fs.existsSync(envPath);
    
    if (envExists) {
      const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    // Get Gmail credentials
    const emailUser = await question('📧 Enter your Gmail address: ');
    const emailPassword = await question('🔑 Enter your Gmail App Password (16 characters): ');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(emailUser)) {
      console.log('❌ Please enter a valid Gmail address.');
      rl.close();
      return;
    }

    // Validate app password length
    if (emailPassword.length !== 16) {
      console.log('❌ App Password should be 16 characters long.');
      rl.close();
      return;
    }

    // Get other configuration
    const mongoUri = await question('🗄️  MongoDB URI (default: mongodb://localhost:27017/school-portal): ') || 'mongodb://localhost:27017/school-portal';
    const port = await question('🌐 Server port (default: 5000): ') || '5000';
    const frontendUrl = await question('🌍 Frontend URL (default: http://localhost:5008): ') || 'http://localhost:5008';

    // Create .env content
    const envContent = `# MongoDB Configuration
MONGODB_URI=${mongoUri}

# Server Configuration
PORT=${port}
NODE_ENV=development

# Gmail SMTP Configuration
EMAIL_USER=${emailUser}
EMAIL_PASSWORD=${emailPassword}
EMAIL_FROM=${emailUser}

# Frontend URL (for email links)
FRONTEND_URL=${frontendUrl}

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');

    // Test email configuration
    console.log('\n🧪 Testing email configuration...');
    
    // Load environment variables
    require('dotenv').config();
    
    // Test email service
    const emailService = require('./src/services/emailService');
    
    // Wait a moment for the service to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const testEmail = await question('\n📧 Enter an email address to send a test email: ');
    
    if (testEmail) {
      console.log('📤 Sending test email...');
      const success = await emailService.sendTestEmail(testEmail);
      
      if (success) {
        console.log('✅ Test email sent successfully!');
        console.log('📧 Check your email inbox for the test message.');
      } else {
        console.log('❌ Failed to send test email.');
        console.log('🔧 Please check your Gmail credentials and try again.');
      }
    }

    console.log('\n🎉 Email configuration setup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the backend server: npm start');
    console.log('2. Initialize the monitoring system: node src/scripts/initializeMonitoring.js');
    console.log('3. Start the frontend: cd ../frontend && npm start');
    console.log('\n📚 For more information, see NOTIFICATION_SYSTEM.md');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setupEmail(); 