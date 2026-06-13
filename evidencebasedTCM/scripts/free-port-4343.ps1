# Stops processes listening on TCP port 4343 (used by next dev in this repo).
$ErrorActionPreference = "SilentlyContinue"
$listeners = Get-NetTCPConnection -LocalPort 4343 -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) { exit 0 }

$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
    if ($procId -gt 0) {
        Write-Host "Stopping PID $procId (listening on port 4343)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}
exit 0
