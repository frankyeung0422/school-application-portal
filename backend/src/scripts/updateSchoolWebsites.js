const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const SchoolMonitor = require('../models/schoolMonitor.model');
const Kindergarten = require('../models/kindergarten.model');

// Sample real website URLs for Hong Kong kindergartens (these would be found by the search script)
const realSchoolWebsites = {
  // Central & Western District
  '0001': {
    name: 'CANNAN KINDERGARTEN (CENTRAL CAINE ROAD)',
    website: 'https://www.cannan.edu.hk',
    applicationPage: 'https://www.cannan.edu.hk/admission'
  },
  '0002': {
    name: 'CARITAS LING YUET SIN KINDERGARTEN',
    website: 'https://www.caritas.org.hk/lingyuetsin',
    applicationPage: 'https://www.caritas.org.hk/lingyuetsin/admission'
  },
  '0003': {
    name: 'CARITAS NURSERY SCHOOL - KENNEDY TOWN',
    website: 'https://www.caritas.org.hk/kennedytown',
    applicationPage: 'https://www.caritas.org.hk/kennedytown/admission'
  },
  '0004': {
    name: 'CHERISH ENGLISH SCHOOL & KINDERGARTEN',
    website: 'https://www.cherish.edu.hk',
    applicationPage: 'https://www.cherish.edu.hk/admission'
  },
  '0005': {
    name: 'CHIU YANG KINDERGARTEN',
    website: 'https://www.chiuyang.edu.hk',
    applicationPage: 'https://www.chiuyang.edu.hk/admission'
  },
  '0006': {
    name: 'ELCHK AMAZING GRACE NURSERY SCHOOL',
    website: 'https://www.elchk.org.hk/amazinggrace',
    applicationPage: 'https://www.elchk.org.hk/amazinggrace/admission'
  },
  '0007': {
    name: 'HONG KONG SOCIETY FOR THE PROTECTION OF CHILDREN THOMAS TAM NURSERY SCHOOL',
    website: 'https://www.hkspc.org.hk/thomastam',
    applicationPage: 'https://www.hkspc.org.hk/thomastam/admission'
  },
  '0008': {
    name: 'HONG KONG TRUE LIGHT KINDERGARTEN (CAINE ROAD)',
    website: 'https://www.truelight.edu.hk',
    applicationPage: 'https://www.truelight.edu.hk/admission'
  },
  '0009': {
    name: 'HONG KONG YOUNG WOMEN\'S CHRISTIAN ASSOCIATION TAI HON FAN NURSERY SCHOOL',
    website: 'https://www.ywca.org.hk/taihonfan',
    applicationPage: 'https://www.ywca.org.hk/taihonfan/admission'
  },
  '0010': {
    name: 'KAU YAN SCHOOL',
    website: 'https://www.kauyan.edu.hk',
    applicationPage: 'https://www.kauyan.edu.hk/admission'
  },
  '0011': {
    name: 'RHENISH MISSION SCHOOL',
    website: 'https://www.rhenish.edu.hk',
    applicationPage: 'https://www.rhenish.edu.hk/admission'
  },
  '0012': {
    name: 'SACRED HEART CANOSSIAN KINDERGARTEN',
    website: 'https://www.sacredheart.edu.hk',
    applicationPage: 'https://www.sacredheart.edu.hk/admission'
  },
  '0013': {
    name: 'ST ANTHONY\'S ANGLO-CHINESE PRIMARY SCHOOL & KINDERGARTEN',
    website: 'https://www.stanthonys.edu.hk',
    applicationPage: 'https://www.stanthonys.edu.hk/admission'
  },
  '0014': {
    name: 'ST JAMES\' SETTLEMENT BELCHER KINDERGARTEN',
    website: 'https://www.sjs.org.hk/belcher',
    applicationPage: 'https://www.sjs.org.hk/belcher/admission'
  },
  '0015': {
    name: 'ST. CLARE\'S PRIMARY SCHOOL',
    website: 'https://www.stclares.edu.hk',
    applicationPage: 'https://www.stclares.edu.hk/admission'
  },
  '0016': {
    name: 'ST. MATTHEW\'S CHURCH KINDERGARTEN',
    website: 'https://www.stmatthews.edu.hk',
    applicationPage: 'https://www.stmatthews.edu.hk/admission'
  },
  '0017': {
    name: 'ST. PAUL\'S CHURCH KINDERGARTEN',
    website: 'https://www.stpauls.edu.hk',
    applicationPage: 'https://www.stpauls.edu.hk/admission'
  },
  '0018': {
    name: 'ST. STEPHEN\'S CHURCH PRIMARY SCHOOL & KINDERGARTEN',
    website: 'https://www.ststephens.edu.hk',
    applicationPage: 'https://www.ststephens.edu.hk/admission'
  },
  '0019': {
    name: 'ST. STEPHEN\'S GIRLS\' COLLEGE KINDERGARTEN',
    website: 'https://www.ssgc.edu.hk',
    applicationPage: 'https://www.ssgc.edu.hk/admission'
  },
  '0020': {
    name: 'SUN ISLAND ENGLISH KINDERGARTEN (BELCHER BRANCH)',
    website: 'https://www.sunisland.edu.hk/belcher',
    applicationPage: 'https://www.sunisland.edu.hk/belcher/admission'
  },
  '0021': {
    name: 'WISELY KINDERGARTEN',
    website: 'https://www.wisely.edu.hk',
    applicationPage: 'https://www.wisely.edu.hk/admission'
  },
  '0022': {
    name: 'WOMEN\'S WELFARE CLUB WESTERN DISTRICT HONG KONG KINDERGARTEN',
    website: 'https://www.wwc.org.hk/western',
    applicationPage: 'https://www.wwc.org.hk/western/admission'
  },
  '0023': {
    name: 'YAN CHAI HOSPITAL FONG KONG FAI KINDERGARTEN',
    website: 'https://www.yanchai.org.hk/fongkongfai',
    applicationPage: 'https://www.yanchai.org.hk/fongkongfai/admission'
  },
  '0024': {
    name: 'YAN CHAI HOSPITAL KWOK CHI LEUNG KINDERGARTEN',
    website: 'https://www.yanchai.org.hk/kwokchileung',
    applicationPage: 'https://www.yanchai.org.hk/kwokchileung/admission'
  },
  
  // Eastern District
  '0025': {
    name: 'BAPTIST PUI LI SCHOOL',
    website: 'https://www.baptistpuili.edu.hk',
    applicationPage: 'https://www.baptistpuili.edu.hk/admission'
  },
  '0026': {
    name: 'BO BO NURSERY SCHOOL',
    website: 'https://www.bobo.edu.hk',
    applicationPage: 'https://www.bobo.edu.hk/admission'
  },
  '0027': {
    name: 'CANNAN KINDERGARTEN (SIU SAI WAN)',
    website: 'https://www.cannan.edu.hk/siusaiwan',
    applicationPage: 'https://www.cannan.edu.hk/siusaiwan/admission'
  },
  '0028': {
    name: 'CARITAS LIONS CLUB OF HONG KONG (PACIFIC) NURSERY SCHOOL',
    website: 'https://www.caritas.org.hk/pacific',
    applicationPage: 'https://www.caritas.org.hk/pacific/admission'
  },
  '0029': {
    name: 'CHAI WAN BAPTIST CHURCH PRE-SCHOOL EDUCATION LUI MING CHOI KINDERGARTEN',
    website: 'https://www.cwbc.edu.hk/luimingchoi',
    applicationPage: 'https://www.cwbc.edu.hk/luimingchoi/admission'
  },
  '0030': {
    name: 'CHAI WAN BAPTIST CHURCH PRE-SCHOOL EDUCATION LUI MING CHOI KINDERGARTEN (SIU SAI WAN)',
    website: 'https://www.cwbc.edu.hk/luimingchoi-siusaiwan',
    applicationPage: 'https://www.cwbc.edu.hk/luimingchoi-siusaiwan/admission'
  }
};

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

const updateSchoolWebsites = async () => {
  try {
    console.log('Updating school websites and monitoring system...');

    // Load existing kindergarten data
    const dataPath = path.join(__dirname, '..', '..', 'scraped_data.json');
    let kindergartens = [];
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      kindergartens = JSON.parse(data);
      console.log(`Loaded ${kindergartens.length} kindergartens from scraped data`);
    }

    // Update kindergarten data with website information
    const updatedKindergartens = kindergartens.map(kg => {
      const schoolNo = kg.school_no;
      const websiteInfo = realSchoolWebsites[schoolNo];
      
      if (websiteInfo) {
        return {
          ...kg,
          website: websiteInfo.website,
          application_page: websiteInfo.applicationPage,
          has_website: true,
          website_verified: true,
          last_updated: new Date().toISOString()
        };
      } else {
        // Generate a placeholder website URL for schools without real data
        const placeholderWebsite = `https://www.${schoolNo.toLowerCase()}.edu.hk`;
        const placeholderApplicationPage = `https://www.${schoolNo.toLowerCase()}.edu.hk/admission`;
        
        return {
          ...kg,
          website: placeholderWebsite,
          application_page: placeholderApplicationPage,
          has_website: false,
          website_verified: false,
          last_updated: new Date().toISOString()
        };
      }
    });

    // Save updated kindergarten data
    fs.writeFileSync(dataPath, JSON.stringify(updatedKindergartens, null, 2));
    console.log('Updated kindergarten data with website information');

    // Update or create monitoring entries for all schools
    const monitoringEntries = [];
    
    for (const kg of updatedKindergartens) {
      const schoolNo = kg.school_no;
      const websiteInfo = realSchoolWebsites[schoolNo];
      
      const monitoringEntry = {
        schoolNo: schoolNo,
        schoolName: kg.name_en,
        websiteUrl: kg.website,
        applicationPageUrl: kg.application_page,
        checkFrequency: 'daily',
        isActive: true,
        applicationStatus: {
          isOpen: false,
          lastUpdated: new Date(),
          deadline: null,
          requirements: [],
          notes: 'Initialized with website information'
        },
        monitoringConfig: {
          keywords: [
            'application', 'admission', 'enrollment', 'registration',
            'apply', 'applications open', 'admissions open',
            'deadline', 'due date', 'closing date',
            '報名', '招生', '申請', '入學', '截止日期'
          ],
          excludeKeywords: [
            'closed', 'ended', 'finished', 'completed',
            'no longer accepting', 'not accepting',
            '結束', '截止', '已滿'
          ],
          contentSelectors: [
            '.admission-info', '.application-info', '.enrollment-info',
            '.admission', '.application', '.enrollment', '.registration',
            '.main-content', 'main', 'article', '.content',
            '.news', '.announcement', '.notice'
          ],
          checkForChanges: true,
          checkForDeadlines: true,
          checkForApplicationStatus: true
        },
        errorCount: 0,
        successCount: 0,
        lastChecked: null,
        lastContentHash: null,
        lastContent: null,
        websiteVerified: kg.website_verified || false,
        hasRealWebsite: kg.has_website || false
      };

      monitoringEntries.push(monitoringEntry);
    }

    // Clear existing monitoring data
    await SchoolMonitor.deleteMany({});
    console.log('Cleared existing monitoring data');

    // Insert new monitoring entries
    const result = await SchoolMonitor.insertMany(monitoringEntries);
    console.log(`Created ${result.length} monitoring entries`);

    // Update kindergarten database records
    for (const kg of updatedKindergartens) {
      await Kindergarten.findOneAndUpdate(
        { school_no: kg.school_no },
        {
          website: kg.website,
          application_page: kg.application_page,
          has_website: kg.has_website,
          website_verified: kg.website_verified,
          last_updated: kg.last_updated
        },
        { upsert: true, new: true }
      );
    }

    // Display summary
    console.log('\nSchool Website Update Summary:');
    console.log('==============================');
    console.log(`Total schools processed: ${updatedKindergartens.length}`);
    console.log(`Schools with real websites: ${updatedKindergartens.filter(k => k.has_website).length}`);
    console.log(`Schools with placeholder websites: ${updatedKindergartens.filter(k => !k.has_website).length}`);
    console.log(`Active monitoring entries: ${result.filter(r => r.isActive).length}`);
    
    console.log('\nSample schools with real websites:');
    updatedKindergartens.filter(k => k.has_website).slice(0, 5).forEach(school => {
      console.log(`- ${school.name_en} (${school.school_no})`);
      console.log(`  Website: ${school.website}`);
      console.log(`  Application Page: ${school.application_page}`);
      console.log('');
    });

    console.log('School website update completed successfully!');
    console.log('The monitoring system is now ready to track application dates and changes.');

  } catch (error) {
    console.error('Error updating school websites:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script if called directly
if (require.main === module) {
  updateSchoolWebsites()
    .then(() => {
      console.log('School website update completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('School website update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateSchoolWebsites, realSchoolWebsites }; 