# Hong Kong School Data Scraper

This system automatically scrapes and updates kindergarten and primary school data in Hong Kong, running nightly to keep information current.

## Features

- **Automatic Data Collection**: Scrapes school data from multiple sources
- **Dual School Types**: Supports both kindergarten and primary school data
- **Scheduled Updates**: Runs automatically every night at 2:00 AM
- **Database Integration**: Updates local SQLite database
- **Website Verification**: Checks and validates school websites
- **Comprehensive Logging**: Detailed logs for monitoring and debugging

## Files Overview

### Core Scraper Files
- `hk_school_scraper.py` - Main comprehensive scraper with Hong Kong-specific data
- `auto_school_scraper.py` - Alternative scraper with basic functionality
- `scraper_requirements.txt` - Python dependencies for the scraper

### Automation Scripts
- `run_scraper.bat` - Windows batch script to run scraper manually
- `start_scraper_scheduler.ps1` - PowerShell script to start scheduler
- `setup_windows_scheduler.bat` - Sets up Windows Task Scheduler

### Data Files
- `scraped_data/` - Directory containing scraped JSON data files
- `school_portal.db` - SQLite database with school information
- `hk_school_scraper.log` - Log file for scraper operations

## Installation

1. **Install Python Dependencies**:
   ```bash
   pip install -r scraper_requirements.txt
   ```

2. **Verify Installation**:
   ```bash
   python hk_school_scraper.py --run-now
   ```

## Usage

### Manual Execution

**Run complete scraping (both kindergarten and primary schools)**:
```bash
python hk_school_scraper.py --run-now
```

**Scrape only kindergartens**:
```bash
python hk_school_scraper.py --kindergarten-only --run-now
```

**Scrape only primary schools**:
```bash
python hk_school_scraper.py --primary-only --run-now
```

### Windows Batch Script
```bash
run_scraper.bat
```

### Automated Scheduling

#### Option 1: Windows Task Scheduler (Recommended)
1. Run `setup_windows_scheduler.bat` as administrator
2. The scraper will automatically run every night at 2:00 AM

#### Option 2: Python Scheduler
```bash
python hk_school_scraper.py --start-scheduler
```

#### Option 3: PowerShell Scheduler
```powershell
.\start_scraper_scheduler.ps1
```

## Data Sources

### Kindergarten Data
- EDB (Education Bureau) Kindergarten Profile
- School websites for additional information
- Sample data for testing and development

### Primary School Data
- EDB Primary School Admission Information
- School websites for application details
- Sample data for testing and development

## Database Schema

### Kindergartens Table
```sql
CREATE TABLE kindergartens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_no TEXT UNIQUE,
    name_en TEXT,
    name_tc TEXT,
    district_en TEXT,
    district_tc TEXT,
    address_en TEXT,
    address_tc TEXT,
    tel TEXT,
    website TEXT,
    school_type TEXT,
    curriculum TEXT,
    funding_type TEXT,
    through_train BOOLEAN,
    language_of_instruction TEXT,
    student_capacity TEXT,
    application_page TEXT,
    has_website BOOLEAN,
    website_verified BOOLEAN,
    last_updated TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Primary Schools Table
```sql
CREATE TABLE primary_schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_no TEXT UNIQUE,
    name_en TEXT,
    name_tc TEXT,
    district_en TEXT,
    district_tc TEXT,
    address_en TEXT,
    address_tc TEXT,
    tel TEXT,
    website TEXT,
    school_type TEXT,
    curriculum TEXT,
    funding_type TEXT,
    through_train BOOLEAN,
    language_of_instruction TEXT,
    student_capacity TEXT,
    application_page TEXT,
    has_website BOOLEAN,
    website_verified BOOLEAN,
    last_updated TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Data Fields

| Field | Description |
|-------|-------------|
| school_no | Unique school identifier |
| name_en | School name in English |
| name_tc | School name in Traditional Chinese |
| district_en | District in English |
| district_tc | District in Traditional Chinese |
| address_en | Address in English |
| address_tc | Address in Traditional Chinese |
| tel | Telephone number |
| website | School website URL |
| school_type | "Kindergarten" or "Primary School" |
| curriculum | Curriculum type (Local/International) |
| funding_type | Funding type (Private/Aided/Subsidized) |
| through_train | Whether school has through-train program |
| language_of_instruction | Primary language of instruction |
| student_capacity | Maximum student capacity |
| application_page | URL to application page |
| has_website | Whether school has a website |
| website_verified | Whether website was successfully verified |
| last_updated | Timestamp of last update |
| source | Data source identifier |

## Hong Kong Districts Covered

- Central and Western (中西區)
- Eastern (東區)
- Southern (南區)
- Wan Chai (灣仔區)
- Sham Shui Po (深水埗區)
- Kowloon City (九龍城區)
- Kwun Tong (觀塘區)
- Wong Tai Sin (黃大仙區)
- Yau Tsim Mong (油尖旺區)
- Islands (離島區)
- Kwai Tsing (葵青區)
- North (北區)
- Sai Kung (西貢區)
- Sha Tin (沙田區)
- Tai Po (大埔區)
- Tsuen Wan (荃灣區)
- Tuen Mun (屯門區)
- Yuen Long (元朗區)

## Monitoring and Logging

### Log Files
- `hk_school_scraper.log` - Main scraper log file
- Contains timestamps, log levels, and detailed operation information

### Log Levels
- **INFO**: General operation information
- **ERROR**: Error messages and exceptions
- **WARNING**: Warning messages for potential issues

### Monitoring Commands
```bash
# View recent log entries
tail -f hk_school_scraper.log

# Check database records
sqlite3 school_portal.db "SELECT COUNT(*) FROM kindergartens;"
sqlite3 school_portal.db "SELECT COUNT(*) FROM primary_schools;"

# Check last update time
sqlite3 school_portal.db "SELECT MAX(last_updated) FROM kindergartens;"
```

## Troubleshooting

### Common Issues

1. **Python not found**
   - Ensure Python is installed and in PATH
   - Try running `python --version`

2. **Missing dependencies**
   - Run `pip install -r scraper_requirements.txt`

3. **Permission errors**
   - Run batch scripts as administrator
   - Check file permissions

4. **Network timeouts**
   - Check internet connection
   - Increase timeout values in scraper code

5. **Database errors**
   - Check if `school_portal.db` exists
   - Verify database permissions

### Debug Mode
```bash
# Run with verbose logging
python hk_school_scraper.py --run-now 2>&1 | tee debug.log
```

## Integration with Main Application

The scraper updates the same database (`school_portal.db`) used by the main Streamlit application. The application will automatically see updated school data after each scraping run.

### Database Connection
The main application connects to the database using:
```python
import sqlite3
conn = sqlite3.connect('school_portal.db')
```

### Data Access
Schools can be queried using:
```python
# Get all kindergartens
cursor.execute("SELECT * FROM kindergartens")

# Get all primary schools
cursor.execute("SELECT * FROM primary_schools")

# Get schools by district
cursor.execute("SELECT * FROM kindergartens WHERE district_en = ?", (district,))
```

## Security Considerations

- The scraper respects website robots.txt files
- Implements delays between requests to avoid overwhelming servers
- Uses proper User-Agent headers
- Logs all operations for audit purposes

## Performance Optimization

- Implements connection pooling for database operations
- Uses efficient data structures for processing
- Implements retry logic for failed requests
- Optimizes database queries with proper indexing

## Future Enhancements

- Add support for secondary schools
- Implement more sophisticated website parsing
- Add data validation and quality checks
- Implement email notifications for scraping results
- Add web interface for monitoring scraping status
- Support for multiple database backends (PostgreSQL, MySQL)

## Support

For issues or questions:
1. Check the log files for error messages
2. Review the troubleshooting section
3. Verify all dependencies are installed
4. Test with manual execution first

## License

This scraper is part of the School Application Portal project and follows the same licensing terms. 