@echo off
REM Setup Windows Task Scheduler for daily EBTCM auto-improvement
REM Run this as Administrator

set PROJECT_DIR=C:\Projects\evidencebasedTCM
set TASK_NAME=EBTCM_Daily_AutoImprove
set RUN_TIME=03:00

echo Creating scheduled task: %TASK_NAME%
echo Will run daily at %RUN_TIME%

schtasks /create /tn "%TASK_NAME%" /tr "cmd /c cd /d %PROJECT_DIR% && npx tsx scripts/daily-improve.ts >> logs\daily-improve.log 2>&1" /sc daily /st %RUN_TIME% /f

if %errorlevel% equ 0 (
    echo.
    echo Task created successfully!
    echo Schedule: Daily at %RUN_TIME%
    echo Log file: %PROJECT_DIR%\logs\daily-improve.log
    echo.
    echo To verify: schtasks /query /tn "%TASK_NAME%"
    echo To delete: schtasks /delete /tn "%TASK_NAME%" /f
    echo To run now: schtasks /run /tn "%TASK_NAME%"
) else (
    echo Failed to create task. Run as Administrator.
)

if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"
pause
