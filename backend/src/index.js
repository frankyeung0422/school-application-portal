const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes (conditional)
const kindergartensRouter = require('./routes/kindergartens');
const notificationsRouter = require('./routes/notifications');
const usersRouter = require('./routes/users');
const monitoringRouter = require('./routes/monitoring');

// Import services
const schedulerService = require('./services/schedulerService');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (Optional)
let mongoConnected = false;
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-portal';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
    mongoConnected = true;
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed, running in file-based mode');
    console.warn('   Some features (notifications, user accounts) will be limited');
    mongoConnected = false;
  }
};

// Load scraped kindergarten data
let kindergartens = [];
try {
  const dataPath = path.join(__dirname, '..', 'scraped_data.json');
  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    kindergartens = JSON.parse(data);
    console.log(`📚 Loaded ${kindergartens.length} kindergartens from scraped data`);
  } else {
    console.log('⚠️ No scraped data found, using empty array');
  }
} catch (error) {
  console.error('❌ Error loading scraped data:', error);
}

// Routes - Only load MongoDB-dependent routes if MongoDB is connected
if (mongoConnected) {
  app.use('/api/kindergartens', kindergartensRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/monitoring', monitoringRouter);
  console.log('🔗 MongoDB routes enabled');
} else {
  console.log('🔗 File-based routes enabled (MongoDB routes disabled)');
}

// Enhanced legacy routes for backward compatibility (always available)
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

// Get districts endpoint
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    kindergartens: kindergartens.length,
    mode: mongoConnected ? 'full' : 'file-based'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Welcome to the School Application Portal API');
});

// Initialize application
const initializeApp = async () => {
  try {
    // Try to connect to MongoDB (optional)
    await connectDB();
    
    // Initialize scheduler only if MongoDB is connected
    if (mongoConnected) {
      schedulerService.initialize();
      console.log('🔄 Scheduler initialized and running');
    } else {
      console.log('⚠️ Scheduler disabled (MongoDB not available)');
    }
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server is running on port: ${port}`);
      console.log(`📚 Available kindergartens: ${kindergartens.length}`);
      console.log(`🔧 Mode: ${mongoConnected ? 'Full (with MongoDB)' : 'File-based (MongoDB not available)'}`);
      console.log(`📧 Email service: ✅ Configured`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (mongoConnected) {
    schedulerService.stopAllJobs();
    mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (mongoConnected) {
    schedulerService.stopAllJobs();
    mongoose.connection.close();
  }
  process.exit(0);
});

// Start the application
initializeApp(); 