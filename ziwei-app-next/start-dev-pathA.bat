@echo off
REM ============================================================
REM  Ziwei App - Path A bootstrap
REM  Boots the new Next.js site with placeholder env vars so the
REM  design + public pages work without a real DB or AI keys.
REM
REM  After this finishes, open http://localhost:3000
REM  Stop the server with Ctrl+C.
REM ============================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Ziwei App (Path A) ===
echo Repo: %CD%
echo.

REM ----- Step 1: pnpm check -----
where pnpm >nul 2>&1
if errorlevel 1 goto :NO_PNPM

REM ----- Step 2: install dependencies if missing -----
if not exist "node_modules" goto :INSTALL_DEPS
goto :AFTER_INSTALL

:INSTALL_DEPS
echo [*] node_modules missing. Running pnpm install (one-time, ~30s)...
call pnpm install
if errorlevel 1 goto :INSTALL_FAILED

:AFTER_INSTALL

REM ----- Step 3: generate Prisma client if not yet generated -----
if exist "apps\web\node_modules\.prisma\client\index.d.ts" goto :AFTER_PRISMA
echo [*] Generating Prisma client...
call pnpm --filter @ziwei/web exec prisma generate
:AFTER_PRISMA

REM ----- Step 4: write placeholder .env.local if missing -----
if exist "apps\web\.env.local" goto :AFTER_ENV
echo [*] Creating apps\web\.env.local with placeholder values...
(
  echo SKIP_ENV_VALIDATION=1
  echo DATABASE_URL=postgresql://placeholder@localhost:5432/placeholder
  echo DIRECT_URL=postgresql://placeholder@localhost:5432/placeholder
  echo JWT_SECRET=dev_only_secret_thirty_two_chars_minimum_xxxxxxxxxxxx
  echo SESSION_COOKIE_NAME=ziwei_session
  echo SESSION_MAX_AGE_DAYS=30
  echo STRIPE_SECRET_KEY=sk_test_placeholder
  echo STRIPE_WEBHOOK_SECRET=whsec_placeholder
  echo STRIPE_PRICE_MONTHLY=price_placeholder_monthly
  echo STRIPE_PRICE_ANNUAL=price_placeholder_annual
  echo STRIPE_PRICE_MASTER=price_placeholder_master
  echo STRIPE_TRIAL_DAYS=7
  echo ANTHROPIC_API_KEY=sk-ant-placeholder
  echo GEMINI_API_KEY=placeholder_long_enough_string
  echo SENDGRID_API_KEY=SG.placeholder
  echo EMAIL_FROM=dev@example.com
  echo EMAIL_REPLY_TO=dev@example.com
  echo NEXT_PUBLIC_APP_URL=http://localhost:3000
  echo NEXT_PUBLIC_SUPPORT_EMAIL=dev@example.com
  echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
) > "apps\web\.env.local"
if errorlevel 1 goto :ENV_FAILED
echo [*] Placeholder .env.local created.
goto :AFTER_ENV2

:AFTER_ENV
echo [*] apps\web\.env.local already exists. Using as-is.

:AFTER_ENV2

REM ----- Step 5: free port 3000 if in use -----
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
  echo [*] Port 3000 in use by PID %%P. Stopping it...
  taskkill /F /PID %%P >nul 2>&1
)

echo.
echo === Booting Next.js dev server on http://localhost:3000 ===
echo     Engine: @ziwei/engine v0.3.0
echo     Mode:   Path A - placeholder env, no DB
echo     Pages:  / /pricing /sample /celebrity/[slug] /zodiac/[sign]/[year]
echo             /admin/calc-audit /api/health /api/og/home
echo.
echo     Ctrl+C stops the server.
echo.

call pnpm --filter @ziwei/web dev
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

:ENV_FAILED
echo [!] Failed to write .env.local.
pause
exit /b 1

:END
endlocal
