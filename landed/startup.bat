@echo off
setlocal enabledelayedexpansion

rem ---------------------------------------------------------------
rem 到手價 Landed — one-click start
rem   1. free the web port
rem   2. kill any stale job worker (NEVER two workers on one SQLite file)
rem   3. install deps / apply migrations / seed defaults if needed
rem   4. start the job worker (crawls, supermarket sync, FX, alerts)
rem   5. start the web UI, wait for it, open the browser
rem
rem Without the worker, searches sit at "PENDING" forever and supermarket
rem prices never refresh — so this script always starts both.
rem ---------------------------------------------------------------

set "PORT=6565"
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo [1/6] Freeing port %PORT% ...
set "KILLED="
for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  if not "%%P"=="0" (
    echo   - killing PID %%P
    taskkill /F /PID %%P >nul 2>&1
    set "KILLED=1"
  )
)
if defined KILLED (
  rem give Windows a moment to release the socket
  rem (full path: a stray ping.py on PATH otherwise shadows ping.exe)
  "%SystemRoot%\System32\ping.exe" -n 3 127.0.0.1 >nul
) else (
  echo   - nothing was listening on %PORT%
)

echo [2/6] Killing stale job worker and orphaned web processes ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'scripts[\\/]worker\.ts' } | ForEach-Object { Write-Host ('  - killing worker PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
rem A `next dev` parent can outlive its killed server child and keep dev.db open,
rem which makes the migration step fail with SQLITE_IOERR. Kill it too.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'landed[\\/]node_modules.*next.*(dev|start) -p %PORT%' } | ForEach-Object { Write-Host ('  - killing web PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

if not exist "node_modules\next" (
  echo [3/6] Installing dependencies ^(first run, this takes a few minutes^) ...
  call npm install || goto :failed
) else (
  echo [3/6] Dependencies present.
)

echo [4/6] Applying database migrations ...
call npx prisma migrate deploy || goto :failed
call npx prisma generate >nul 2>&1

echo       Seeding defaults ^(idempotent^) ...
call npm run seed || goto :failed

echo [5/6] Starting job worker ...
start "landed-worker" cmd /k "cd /d "%ROOT%" && npm run worker"

echo [6/6] Starting web UI on http://localhost:%PORT% ...
start "landed-web" cmd /k "cd /d "%ROOT%" && npm run dev"

echo.
echo Waiting for the web UI to answer ...
set "UP="
for /l %%i in (1,1,60) do (
  if not defined UP (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:%PORT%/login).StatusCode } catch { 0 }" | findstr /r /c:"^200$" >nul && set "UP=1"
    if not defined UP "%SystemRoot%\System32\ping.exe" -n 3 127.0.0.1 >nul
  )
)

echo.
if defined UP (
  echo   Landed is up: http://localhost:%PORT%
  start "" http://localhost:%PORT%
) else (
  echo   Web UI did not answer yet — check the "landed-web" window for errors.
)
echo.
echo   Two windows are running:
echo     landed-worker  job worker: searches, supermarket sync, FX, alerts, pools, listing guard
echo     landed-web     Next.js on port %PORT%
echo.
echo   Admin: http://localhost:%PORT%/admin  ^(admin@landed.local / landed-admin-2026^)
echo   First run downloads ~2,700 supermarket prices within a minute of the worker starting.
echo.
echo   Closing either window stops that part. Run stop.bat to stop both.
endlocal
goto :eof

:failed
echo.
echo   Startup failed — see the error above.
endlocal
exit /b 1
