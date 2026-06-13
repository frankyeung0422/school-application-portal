@echo off
setlocal EnableExtensions
if "%1"=="titlekeeper" goto titlekeeper

title evidencetcm

REM Kill any process listening on TCP port 4343 so npm run dev can bind.
echo Checking port 4343...
if exist "%~dp0scripts\free-port-4343.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\free-port-4343.ps1"
) else (
    echo Warning: scripts\free-port-4343.ps1 not found; skipping port cleanup.
)

start /b "" cmd /c "%~f0" titlekeeper >nul 2>&1
npm run dev
exit /b

:titlekeeper
title evidencetcm
ping -n 3 127.0.0.1 >nul
goto titlekeeper
