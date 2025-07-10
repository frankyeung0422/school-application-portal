const ApplicationDateMonitor = require('./src/services/applicationDateMonitor');

async function demoApplicationMonitoring() {
    console.log('🚀 Starting Application Date Monitoring Demo...\n');
    
    const monitor = new ApplicationDateMonitor();
    
    // Sample school websites to test (these are real Hong Kong school websites)
    const testSchools = [
        {
            name: 'King George V School',
            url: 'https://kgv.esf.edu.hk/en/',
            schoolNo: 'KGV001'
        },
        {
            name: 'Diocesan Girls\' School',
            url: 'https://www.dgs.edu.hk/',
            schoolNo: 'DGS001'
        },
        {
            name: 'St. Paul\'s Co-educational College',
            url: 'https://www.spcc.edu.hk/',
            schoolNo: 'SPCC001'
        }
    ];
    
    console.log('📋 Testing Application Date Monitoring for Sample Schools:\n');
    
    for (const school of testSchools) {
        console.log(`🏫 School: ${school.name} (${school.schoolNo})`);
        console.log(`🌐 Website: ${school.url}`);
        
        try {
            const analysis = await monitor.analyzeApplicationPage(school.url);
            
            console.log(`📊 Analysis Results:`);
            console.log(`   Status: ${analysis.status}`);
            console.log(`   Is Open: ${analysis.isOpen ? 'Yes' : 'No'}`);
            console.log(`   Start Date: ${analysis.startDate ? new Date(analysis.startDate).toLocaleDateString() : 'Not found'}`);
            console.log(`   End Date: ${analysis.endDate ? new Date(analysis.endDate).toLocaleDateString() : 'Not found'}`);
            console.log(`   Language: ${analysis.language}`);
            console.log(`   Confidence: ${Math.round(analysis.confidence * 100)}%`);
            console.log(`   Requirements Found: ${analysis.requirements.length}`);
            
            if (analysis.requirements.length > 0) {
                console.log(`   Sample Requirements:`);
                analysis.requirements.slice(0, 2).forEach((req, index) => {
                    console.log(`     ${index + 1}. ${req.substring(0, 80)}...`);
                });
            }
            
            console.log('---');
            
        } catch (error) {
            console.log(`❌ Error analyzing ${school.name}: ${error.message}`);
            console.log('---');
        }
    }
    
    console.log('✅ Application Date Monitoring Demo Completed!\n');
    console.log('📋 Summary of what was tested:');
    console.log('✅ Real school website analysis');
    console.log('✅ Application status detection');
    console.log('✅ Start/End date extraction');
    console.log('✅ Multi-language support (Chinese/English)');
    console.log('✅ Requirements extraction');
    console.log('✅ Confidence scoring');
    console.log('\n🎯 Next Steps:');
    console.log('1. Set up MongoDB connection in .env file');
    console.log('2. Run: npm run monitor-all (to monitor all schools)');
    console.log('3. Run: npm run monitor-application-dates (to focus on dates)');
    console.log('4. Check frontend to see updated school cards with application dates');
}

demoApplicationMonitoring().catch(console.error); 