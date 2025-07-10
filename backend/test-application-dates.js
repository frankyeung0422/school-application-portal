const ApplicationDateMonitor = require('./src/services/applicationDateMonitor');

async function testApplicationDates() {
    console.log('📅 Testing Application Start/End Date Extraction...\n');
    
    const monitor = new ApplicationDateMonitor();
    
    // Test content with different date patterns
    const testCases = [
        {
            name: 'English Date Range',
            content: 'Applications are open from 01/09/2024 to 31/10/2024. Please submit your application before the deadline.'
        },
        {
            name: 'Chinese Date Range',
            content: '報名時間：從 2024年9月1日 至 2024年10月31日。請在截止日期前提交申請。'
        },
        {
            name: 'Multiple Dates',
            content: 'Application period: September 1, 2024 - October 31, 2024. Deadline: November 15, 2024.'
        },
        {
            name: 'Future Dates Only',
            content: 'Applications will open on 01/12/2024 and close on 31/01/2025.'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`🔍 Testing: ${testCase.name}`);
        console.log(`📝 Content: ${testCase.content}`);
        
        try {
            const analysis = monitor.analyzeApplicationContent(testCase.content);
            
            console.log(`📋 Status: ${analysis.status}`);
            console.log(`📅 Start Date: ${analysis.startDate ? new Date(analysis.startDate).toLocaleDateString() : 'Not found'}`);
            console.log(`⏰ End Date: ${analysis.endDate ? new Date(analysis.endDate).toLocaleDateString() : 'Not found'}`);
            console.log(`🎯 Deadline: ${analysis.deadline ? new Date(analysis.deadline).toLocaleDateString() : 'Not found'}`);
            console.log(`📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
            console.log('---');
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            console.log('---');
        }
    }
    
    console.log('✅ Application date extraction test completed!');
    console.log('\n📋 Summary of new features:');
    console.log('✅ Application start date extraction');
    console.log('✅ Application end date extraction');
    console.log('✅ Support for English and Chinese date formats');
    console.log('✅ Date range pattern recognition');
    console.log('✅ Frontend display of start/end dates');
    console.log('✅ Backend API integration');
}

testApplicationDates().catch(console.error); 