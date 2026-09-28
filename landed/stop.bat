@echo off
setlocal
set "PORT=6565"
echo Stopping 到手價 Landed ...

for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  if not "%%P"=="0" (
    echo   - web PID %%P
    taskkill /F /PID %%P >nul 2>&1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'scripts[\\/]worker\.ts' } | ForEach-Object { Write-Host ('  - worker PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

rem The `next dev` parent can outlive its server child and keep dev.db open.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'landed[\\/]node_modules.*next.*(dev|start) -p %PORT%' } | ForEach-Object { Write-Host ('  - web PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Done.
endlocal
