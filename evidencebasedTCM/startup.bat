@echo off
cd /d "%~dp0"

echo Killing existing process on port 4343...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4343 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Building Evidence-Based TCM...
call npm run build
echo Starting production server on port 4343...
npx next start --port 4343
