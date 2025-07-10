const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a minimal server for testing
const app = express();
app.use(cors());
app.use(express.json());

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

// Test API endpoints
app.get('/api/kindergartens', (req, res) => {
  const { district, search, page = 1, limit = 20 } = req.query;
  
  let filteredKindergartens = [...kindergartens];
  
  // Filter by district
  if (district && district !== 'all') {
    filteredKindergartens = filteredKindergartens.filter(kg => 
      (kg.district_en && kg.district_en.toLowerCase().includes(district.toLowerCase())) ||
      (kg.district_tc && kg.district_tc.includes(district)) ||
      (kg.district && kg.district.toLowerCase().includes(district.toLowerCase()))
    );
  }
  
  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    filteredKindergartens = filteredKindergartens.filter(kg => 
      (kg.name_en && kg.name_en.toLowerCase().includes(searchLower)) ||
      (kg.name_tc && kg.name_tc.includes(search)) ||
      (kg.school_name && kg.school_name.toLowerCase().includes(searchLower)) ||
      (kg.district_en && kg.district_en.toLowerCase().includes(searchLower)) ||
      (kg.district_tc && kg.district_tc.includes(search)) ||
      (kg.district && kg.district.toLowerCase().includes(searchLower))
    );
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedKindergartens = filteredKindergartens.slice(startIndex, endIndex);
  
  const response = {
    kindergartens: paginatedKindergartens,
    total: filteredKindergartens.length,
    page: parseInt(page),
    totalPages: Math.ceil(filteredKindergartens.length / limit),
    hasNext: endIndex < filteredKindergartens.length,
    hasPrev: page > 1
  };
  
  console.log(`📊 API Response: ${response.kindergartens.length} kindergartens, total: ${response.total}`);
  res.json(response);
});

app.get('/api/districts', (req, res) => {
  const districts = [...new Set(kindergartens
    .map(kg => kg.district_en)
    .filter(district => district && district.trim() !== '')
  )].sort();
  
  const response = {
    districts: ['All Districts', ...districts],
    total: districts.length
  };
  
  console.log(`🏘️ Districts API Response: ${response.districts.length} districts`);
  res.json(response);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    kindergartens: kindergartens.length,
    mode: 'test'
  });
});

const port = 5000;
app.listen(port, () => {
  console.log(`🚀 Test server running on port: ${port}`);
  console.log(`📚 Available kindergartens: ${kindergartens.length}`);
  console.log(`🔗 Test URLs:`);
  console.log(`   - http://localhost:${port}/api/kindergartens`);
  console.log(`   - http://localhost:${port}/api/districts`);
  console.log(`   - http://localhost:${port}/api/health`);
}); 