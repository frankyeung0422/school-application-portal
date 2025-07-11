@echo off
echo Starting School Data Scraper...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Install required packages if not already installed
echo Installing required packages...
pip install -r scraper_requirements.txt

REM Run the scraper
echo.
echo Running school data scraper...
python auto_school_scraper.py --run-now

echo.
echo Scraping completed!
pause 