@echo off
setlocal
title Uninstall Iconify Search for Word
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall.ps1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" echo  UNINSTALLATION FAILED
pause
exit /b %EXITCODE%