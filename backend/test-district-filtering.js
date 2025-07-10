const fs = require('fs');
const path = require('path');

// Load the scraped data
const dataPath = path.join(__dirname, 'scraped_data.json');
console.log('Loading data from:', dataPath);
const kindergartens = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
console.log(`Loaded ${kindergartens.length} kindergartens`);

console.log('🔍 District Filtering Debug Test\n');

// 1. Check all unique districts in the data
console.log('📊 All Districts in Data:');
const allDistricts = [...new Set(kindergartens.map(kg => kg.district_en).filter(d => d))].sort();
console.log(`Total unique districts: ${allDistricts.length}`);
allDistricts.forEach(district => console.log(`  - ${district}`));

// 2. Check Kowloon City specifically
console.log('\n🏙️ Kowloon City Schools:');
const kowloonCitySchools = kindergartens.filter(kg => 
  (kg.district_en && kg.district_en === 'Kowloon City') ||
  (kg.district_tc && kg.district_tc === '九龍城區')
);

console.log(`Found ${kowloonCitySchools.length} schools in Kowloon City:`);
kowloonCitySchools.slice(0, 10).forEach(school => {
  console.log(`  - ${school.name_en} (${school.district_en} / ${school.district_tc})`);
});

if (kowloonCitySchools.length > 10) {
  console.log(`  ... and ${kowloonCitySchools.length - 10} more`);
}

// 3. Check for any inconsistencies in district naming
console.log('\n🔍 District Naming Inconsistencies:');
const districtCounts = {};
kindergartens.forEach(kg => {
  if (kg.district_en) {
    districtCounts[kg.district_en] = (districtCounts[kg.district_en] || 0) + 1;
  }
});

Object.entries(districtCounts).forEach(([district, count]) => {
  console.log(`  ${district}: ${count} schools`);
});

// 4. Test the exact filtering logic from frontend
console.log('\n🧪 Testing Frontend Filtering Logic:');
const selectedDistrict = 'Kowloon City';
const filtered = kindergartens.filter(kg => 
  (kg.district_en && kg.district_en === selectedDistrict) ||
  (kg.district_tc && kg.district_tc === selectedDistrict)
);

console.log(`Filtering for "${selectedDistrict}" found ${filtered.length} schools`);

// 5. Check if there are any schools with district_tc but not district_en
console.log('\n🔍 Schools with Traditional Chinese districts:');
const tcOnlySchools = kindergartens.filter(kg => 
  kg.district_tc && !kg.district_en
);
console.log(`Schools with only district_tc: ${tcOnlySchools.length}`);

// 6. Check for schools with both district fields
console.log('\n🔍 Schools with both district fields:');
const bothDistricts = kindergartens.filter(kg => 
  kg.district_en && kg.district_tc
);
console.log(`Schools with both district_en and district_tc: ${bothDistricts.length}`);

// 7. Show sample of district field values
console.log('\n📋 Sample District Field Values:');
kindergartens.slice(0, 5).forEach(kg => {
  console.log(`  ${kg.name_en}:`);
  console.log(`    district_en: "${kg.district_en}"`);
  console.log(`    district_tc: "${kg.district_tc}"`);
});

console.log('\n✅ District filtering debug test completed!'); 