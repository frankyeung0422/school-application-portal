const { updateSchoolWebsites } = require('./src/scripts/updateSchoolWebsites');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-portal';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const runWebsiteUpdate = async () => {
  try {
    console.log('🚀 Starting School Website Update and Monitoring Setup...\n');
    
    // Step 1: Update school websites
    console.log('📝 Step 1: Updating school websites with real URLs...');
    await updateSchoolWebsites();
    
    console.log('\n✅ School website update completed successfully!');
    console.log('\n📊 Next Steps:');
    console.log('1. The monitoring system is now active');
    console.log('2. Schools with real websites will be monitored for application changes');
    console.log('3. Users will receive notifications when applications open/close');
    console.log('4. Application deadlines will be tracked automatically');
    
    console.log('\n🔧 To test the system:');
    console.log('- Run: npm run monitor-all (to test all schools)');
    console.log('- Run: npm run monitor-application-dates (to test application date monitoring)');
    console.log('- Check the frontend to see updated school cards with website information');
    
  } catch (error) {
    console.error('❌ Error during website update:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  runWebsiteUpdate()
    .then(() => {
      console.log('\n🎉 Website update and monitoring setup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Website update failed:', error);
      process.exit(1);
    });
}

module.exports = { runWebsiteUpdate }; 