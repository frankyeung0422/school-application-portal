require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Data Loading and API');
console.log('================================\n');

// Load scraped kindergarten data
let kindergartens = [];
try {
  const dataPath = path.join(__dirname, 'scraped_data.json');
  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    kindergartens = JSON.parse(data);
    console.log(`✅ Loaded ${kindergartens.length} kindergartens from scraped data`);
  } else {
    console.log('❌ No scraped data found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error loading scraped data:', error);
  process.exit(1);
}

// Test data structure
console.log('\n📋 Data Structure Test:');
const sample = kindergartens[0];
console.log('Sample kindergarten:', {
  school_no: sample.school_no,
  name_en: sample.name_en,
  name_tc: sample.name_tc,
  district_en: sample.district_en,
  district_tc: sample.district_tc
});

// Test districts extraction
console.log('\n🏘️ Districts Test:');
const districts = [...new Set(kindergartens
  .map(kg => kg.district_en)
  .filter(district => district && district.trim() !== '')
)].sort();

console.log(`Found ${districts.length} districts:`);
districts.slice(0, 5).forEach(district => console.log(`  - ${district}`));
if (districts.length > 5) {
  console.log(`  ... and ${districts.length - 5} more`);
}

// Test filtering
console.log('\n🔍 Filtering Test:');
const centralSchools = kindergartens.filter(kg => 
  kg.district_en && kg.district_en.toLowerCase().includes('central')
);
console.log(`Schools in Central district: ${centralSchools.length}`);

const searchResults = kindergartens.filter(kg => 
  (kg.name_en && kg.name_en.toLowerCase().includes('cannan')) ||
  (kg.name_tc && kg.name_tc.includes('迦南'))
);
console.log(`Schools with "Cannan" in name: ${searchResults.length}`);

// Test pagination
console.log('\n📄 Pagination Test:');
const page = 1;
const limit = 5;
const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const paginated = kindergartens.slice(startIndex, endIndex);

console.log(`Page ${page} (${limit} items):`);
paginated.forEach((kg, index) => {
  console.log(`  ${index + 1}. ${kg.name_en} (${kg.district_en})`);
});

console.log('\n✅ All tests completed successfully!');
console.log('\n🚀 You can now start the server with: npm start'); 