@echo off
echo Setting up Windows Task Scheduler for School Data Scraper...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as administrator - proceeding with setup
) else (
    echo Error: This script must be run as administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Get current directory
set "SCRIPT_DIR=%~dp0"
set "PYTHON_SCRIPT=%SCRIPT_DIR%hk_school_scraper.py"

REM Create the scheduled task
echo Creating scheduled task for school data scraper...
schtasks /create /tn "School Data Scraper" /tr "python \"%PYTHON_SCRIPT%\" --run-now" /sc daily /st 02:00 /ru SYSTEM /f

if %errorLevel% == 0 (
    echo.
    echo Successfully created scheduled task!
    echo Task Name: School Data Scraper
    echo Schedule: Daily at 2:00 AM
    echo Command: python hk_school_scraper.py --run-now
    echo.
    echo To view the task:
    echo   schtasks /query /tn "School Data Scraper"
    echo.
    echo To delete the task:
    echo   schtasks /delete /tn "School Data Scraper" /f
    echo.
    echo To run the task manually:
    echo   schtasks /run /tn "School Data Scraper"
) else (
    echo Error creating scheduled task
    pause
    exit /b 1
)

echo Setup completed successfully!
pause 