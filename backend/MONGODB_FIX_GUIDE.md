# MongoDB Local Fix Guide

## Common Issues and Solutions:

### Issue 1: MongoDB Service Stops Automatically

**Solution A: Set MongoDB as Automatic Service**
```powershell
# Run as Administrator
sc config MongoDB start= auto
sc start MongoDB
```

**Solution B: Check Windows Event Logs**
1. Open Event Viewer
2. Go to Windows Logs > Application
3. Look for MongoDB errors
4. Check if antivirus is blocking MongoDB

### Issue 2: Port 27017 Already in Use
```powershell
# Check what's using port 27017
netstat -ano | findstr :27017

# Kill the process if needed
taskkill /PID <PID> /F
```

### Issue 3: Data Directory Issues
```powershell
# Create data directory
mkdir C:\data\db

# Set permissions
icacls "C:\data\db" /grant "Everyone:(OI)(CI)F"
```

### Issue 4: MongoDB Configuration
Create `C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg`:
```yaml
systemLog:
  destination: file
  path: C:\data\db\mongod.log
  logAppend: true
storage:
  dbPath: C:\data\db
net:
  bindIp: 127.0.0.1
  port: 27017
```

### Issue 5: Windows Firewall
1. Open Windows Defender Firewall
2. Allow MongoDB through firewall
3. Add inbound rule for port 27017

## Quick Test Commands:
```powershell
# Test MongoDB connection
mongo --eval "db.runCommand('ping')"

# Check MongoDB status
Get-Service MongoDB

# Restart MongoDB
Restart-Service MongoDB
```

## Alternative: Use MongoDB Compass
1. Download MongoDB Compass (GUI)
2. Connect to localhost:27017
3. Visual interface to manage database 