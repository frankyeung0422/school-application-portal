@echo off
REM Start EBTCM in PRODUCTION mode (not dev mode!)
REM This eliminates the webpack-hmr WebSocket error.
REM
REM Usage: Run this script, or set it up as a Windows Service.
REM Always use "next start" for production, NEVER "next dev".

cd /d C:\Projects\evidencebasedTCM

echo ======================================
echo  EBTCM Production Server
echo  Port: 4343
echo  Mode: PRODUCTION (next start)
echo ======================================

REM Build first if .next is missing or stale
if not exist ".next\BUILD_ID" (
    echo Building...
    call npx next build
)

REM Start production server
echo Starting production server on port 4343...
npx next start -p 4343
