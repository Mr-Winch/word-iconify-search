@echo off
setlocal
title Install Iconify Search for Word
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" (
  echo  INSTALLATION FAILED
  echo.
  echo  Review the message above, then try again.
)
pause
exit /b %EXITCODE%