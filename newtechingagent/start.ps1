# 智學坊 AI School — 啟動腳本
# 同時啟動 Backend (FastAPI :8088) + Frontend (Vite :5274)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host "=== 智學坊 AI School ===" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8088" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5274" -ForegroundColor Yellow
Write-Host ""

# --- Backend ---
$venv = Join-Path $backend ".venv"
if (-not (Test-Path $venv)) {
    Write-Host "Creating Python venv..." -ForegroundColor Gray
    python -m venv $venv
}

$pip = Join-Path $venv "Scripts\pip.exe"
$python = Join-Path $venv "Scripts\python.exe"

Write-Host "Installing backend dependencies..." -ForegroundColor Gray
& $pip install -r (Join-Path $backend "requirements.txt") -q

# Copy .env if needed
$env_file = Join-Path $backend ".env"
$env_example = Join-Path $backend ".env.example"
if (-not (Test-Path $env_file) -and (Test-Path $env_example)) {
    Copy-Item $env_example $env_file
    Write-Host "Created backend/.env from .env.example — add your API keys!" -ForegroundColor Magenta
}

Write-Host "Starting backend..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($python, $backend)
    Set-Location $backend
    & $python run.py
} -ArgumentList $python, $backend

# --- Frontend ---
Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
Push-Location $frontend
if (-not (Test-Path "node_modules")) {
    npm install --silent
}

Write-Host "Starting frontend..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    param($frontend)
    Set-Location $frontend
    npx vite --port 5274
} -ArgumentList $frontend
Pop-Location

Write-Host ""
Write-Host "Both services starting..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""
Write-Host "Open: http://localhost:5274" -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 2
        $bOut = Receive-Job $backendJob
        $fOut = Receive-Job $frontendJob
        if ($bOut) { Write-Host "[Backend] $bOut" -ForegroundColor DarkGray }
        if ($fOut) { Write-Host "[Frontend] $fOut" -ForegroundColor DarkGray }
    }
} finally {
    Stop-Job $backendJob, $frontendJob
    Remove-Job $backendJob, $frontendJob
    Write-Host "Services stopped." -ForegroundColor Yellow
}
