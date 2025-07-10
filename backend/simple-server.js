const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
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

// API Routes
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
  
  res.json({
    kindergartens: paginatedKindergartens,
    total: filteredKindergartens.length,
    page: parseInt(page),
    totalPages: Math.ceil(filteredKindergartens.length / limit),
    hasNext: endIndex < filteredKindergartens.length,
    hasPrev: page > 1
  });
});

app.get('/api/kindergartens/:schoolNo', (req, res) => {
  const kindergarten = kindergartens.find(kg => kg.school_no === req.params.schoolNo);
  if (!kindergarten) {
    return res.status(404).json({ error: 'Kindergarten not found' });
  }
  res.json(kindergarten);
});

app.get('/api/districts', (req, res) => {
  const districts = [...new Set(kindergartens
    .map(kg => kg.district_en)
    .filter(district => district && district.trim() !== '')
  )].sort();
  
  res.json({
    districts: ['All Districts', ...districts],
    total: districts.length
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    kindergartens: kindergartens.length,
    mode: 'file-based'
  });
});

app.get('/', (req, res) => {
  res.send('School Application Portal API - File-based Mode');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple server running on port: ${port}`);
  console.log(`📚 Available kindergartens: ${kindergartens.length}`);
  console.log(`🔧 Mode: File-based (no MongoDB required)`);
  console.log(`🔗 Test URLs:`);
  console.log(`   - http://localhost:${port}/api/kindergartens`);
  console.log(`   - http://localhost:${port}/api/districts`);
  console.log(`   - http://localhost:${port}/api/health`);
}); 