// This script reads kindergarten data from a CSV file and imports it into the MongoDB database.
// To run this script, execute: node -r dotenv/config src/scripts/importKindergartens.js
// Make sure you have a .env file in the backend root with your ATLAS_URI.

const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Kindergarten = require('../models/kindergarten.model');

require('dotenv').config({ path: './.env' });


async function importKindergartens() {
  try {
    const uri = process.env.ATLAS_URI;
    if (!uri) {
      console.error('Error: ATLAS_URI is not defined. Please check your .env file.');
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("MongoDB database connection established successfully");

    console.log('Clearing existing kindergarten data...');
    await Kindergarten.deleteMany({});
    console.log('Existing data cleared.');

    const kindergartens = [];
    const filePath = 'src/data/kindergartens.csv';

    console.log(`Reading data from ${filePath}...`);

    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header, index }) => {
            // Normalize headers to match the schema
            if (header.includes('School Name (English)')) return 'name_en';
            if (header.includes('School Name (Chinese)')) return 'name_tc';
            if (header.includes('No.')) return 'school_no';
            if (header.includes('District (English)')) return 'district_en';
            if (header.includes('District (Chinese)')) return 'district_tc';
            return null; // Ignore other columns
        }
      }))
      .on('data', (data) => {
        // Basic data cleaning and validation
        if (data.name_en && data.name_tc && data.school_no) {
            kindergartens.push({
                name_en: data.name_en.trim(),
                name_tc: data.name_tc.trim(),
                school_no: data.school_no.trim(),
                district_en: data.district_en ? data.district_en.trim() : 'N/A',
                district_tc: data.district_tc ? data.district_tc.trim() : 'N/A',
                // Add default values for other fields from the model
                organisation_en: '',
                organisation_tc: '',
                address_en: '',
                address_tc: '',
                website: '',
                tel: '',
                fax: '',
            });
        }
      })
      .on('end', async () => {
        console.log(`Finished reading CSV file. Found ${kindergartens.length} valid records.`);
        if (kindergartens.length > 0) {
          console.log('Importing kindergartens into the database...');
          await Kindergarten.insertMany(kindergartens);
          console.log('Data imported successfully!');
        } else {
          console.log('No data to import.');
        }
        await mongoose.connection.close();
        console.log('Database connection closed.');
      });

  } catch (error) {
    console.error('An error occurred during the import process:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

importKindergartens(); 