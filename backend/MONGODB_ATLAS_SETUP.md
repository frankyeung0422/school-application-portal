# MongoDB Atlas Setup Guide

## Why MongoDB Atlas?
- No local installation required
- Always available (no stopping issues)
- Free tier available (512MB storage)
- Automatic backups
- Better reliability

## Setup Steps:

### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Sign up for a free account
3. Create a new cluster (choose the free tier)

### 2. Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Create a username and password
4. Set privileges to "Read and write to any database"

### 3. Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Or add your specific IP address

### 4. Get Connection String
1. Go to "Clusters" in the left sidebar
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string

### 5. Update Your Environment
Replace your MONGODB_URI in .env with:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/school-portal?retryWrites=true&w=majority
```

### 6. Test Connection
Run: `node test-api.js` to verify the connection works.

## Benefits:
- ✅ No local MongoDB installation
- ✅ No stopping issues
- ✅ Automatic backups
- ✅ Better performance
- ✅ Free tier available 