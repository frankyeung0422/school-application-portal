const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

const csvPath = path.join(__dirname, '../data/kindergartens.csv');
const outputPath = path.join(__dirname, '../../scraped_data.json');

function parseKindergartenCSV() {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    // Remove BOM if present
    const cleaned = csvContent.replace(/^\uFEFF/, '');
    const records = csv.parse(cleaned, {
      columns: true,
      skip_empty_lines: true
    });

    // Normalize and map fields
    const kindergartens = records.map((row, idx) => ({
      school_no: String(idx + 1).padStart(4, '0'),
      name_tc: row["學校名稱(中文) \nSchool Name (Chinese)"]?.trim() || '',
      name_en: row["學校名稱(英文) \nSchool Name (English)"]?.trim() || '',
      district_tc: row["區域(中文) \nDistrict (Chinese)"]?.trim() || '',
      district_en: row["區域(英文) \nDistrict (English)"]?.trim() || '',
      // Add more fields if available in the CSV
    }));

    fs.writeFileSync(outputPath, JSON.stringify(kindergartens, null, 2));
    console.log(`Extracted ${kindergartens.length} kindergartens to scraped_data.json`);
  } catch (err) {
    console.error('Error parsing CSV:', err);
  }
}

parseKindergartenCSV(); 