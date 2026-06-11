@echo off
REM ============================================================
REM  Ziwei App - Production launch (replaces legacy ziwei-app)
REM  Kills whatever is holding port 9001 (the old C:\Projects\ziwei-app
REM  Express server), builds this Next.js monorepo, then starts the
REM  production server on the SAME port so URLs/links stay the same.
REM
REM  After this finishes booting, open http://localhost:9001
REM  Stop the server with Ctrl+C.
REM ============================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Ziwei App Next - Production launch ===
echo Repo: %CD%
echo Port: 9001 (taking over from legacy ziwei-app)
echo.

REM ----- Step 1: pnpm check -----
where pnpm >nul 2>&1
if errorlevel 1 goto :NO_PNPM

REM ----- Step 2: free port 9001 (kill legacy ziwei-app if running) -----
set PORT_PID=
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":9001 " ^| findstr LISTENING') do (
  set PORT_PID=%%P
)
if defined PORT_PID (
  echo [*] Port 9001 in use by PID !PORT_PID!. Stopping legacy ziwei-app...
  taskkill /F /PID !PORT_PID! >nul 2>&1
  if errorlevel 1 (
    echo [!] taskkill failed for PID !PORT_PID!. You may need to run this as admin.
    pause
    exit /b 1
  )
  REM Give the OS a moment to release the socket
  ping -n 2 127.0.0.1 >nul
) else (
  echo [*] Port 9001 free. Nothing to kill.
)

REM ----- Step 3: install dependencies if missing -----
if not exist "node_modules" goto :INSTALL_DEPS
goto :AFTER_INSTALL

:INSTALL_DEPS
echo [*] node_modules missing. Running pnpm install...
call pnpm install
if errorlevel 1 goto :INSTALL_FAILED

:AFTER_INSTALL

REM ----- Step 4: generate Prisma client if not yet generated -----
if exist "apps\web\node_modules\.prisma\client\index.d.ts" goto :AFTER_PRISMA
echo [*] Generating Prisma client...
call pnpm --filter @ziwei/web exec prisma generate
if errorlevel 1 goto :PRISMA_FAILED
:AFTER_PRISMA

REM ----- Step 5: verify env file exists (do NOT overwrite a real one) -----
if not exist "apps\web\.env.local" (
  echo [!] apps\web\.env.local is missing.
  echo     Copy apps\web\.env.local.example to apps\web\.env.local and
  echo     fill in real production secrets before relaunching.
  pause
  exit /b 1
)

REM ----- Step 6: production build -----
echo.
echo === Building production bundle (next build) ===
echo.
set NODE_ENV=production
call pnpm --filter @ziwei/web build
if errorlevel 1 goto :BUILD_FAILED

REM ----- Step 7: start production server on port 9001 -----
echo.
echo === Booting Next.js prod server on http://localhost:9001 ===
echo     Replaces legacy ziwei-app (Express + SQLite) on the same port.
echo     Ctrl+C stops the server.
echo.

call pnpm --filter @ziwei/web start
goto :END

:NO_PNPM
echo [!] pnpm not found on PATH.
echo     Install it with: npm install -g pnpm
pause
exit /b 1

:INSTALL_FAILED
echo [!] pnpm install failed.
pause
exit /b 1

:PRISMA_FAILED
echo [!] prisma generate failed.
pause
exit /b 1

:BUILD_FAILED
echo [!] next build failed. Production server NOT started.
pause
exit /b 1

:END
endlocal
