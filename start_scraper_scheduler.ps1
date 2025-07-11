# School Data Scraper Scheduler
# This script starts the automatic school data scraper that runs nightly

Write-Host "Starting School Data Scraper Scheduler..." -ForegroundColor Green
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install required packages
Write-Host "Installing required packages..." -ForegroundColor Yellow
pip install -r scraper_requirements.txt

Write-Host ""
Write-Host "Starting scheduler..." -ForegroundColor Green
Write-Host "The scraper will run automatically every night at 2:00 AM" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the scheduler" -ForegroundColor Yellow
Write-Host ""

# Run the scheduler
python auto_school_scraper.py --start-scheduler 