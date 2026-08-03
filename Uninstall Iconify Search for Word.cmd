@echo off
setlocal EnableExtensions
title Uninstall Iconify Search for Word

set "ADDIN_ID=7f3bf54a-0d0e-4840-ade6-c630c5b7c22e"
set "TARGET_DIR=%LOCALAPPDATA%\Iconify Search for Word"
set "DEV_KEY=HKCU\SOFTWARE\Microsoft\Office\16.0\Wef\Developer"

echo.
echo  Uninstall Iconify Search for Word
echo  --------------------------------
echo.

tasklist /FI "IMAGENAME eq WINWORD.EXE" 2>nul | find /I "WINWORD.EXE" >nul
if not errorlevel 1 (
  echo  Close every Word window, then run this uninstaller again.
  echo.
  pause
  exit /b 1
)

reg delete "%DEV_KEY%" /v "%ADDIN_ID%" /f >nul 2>nul
reg add "%DEV_KEY%" /v "RefreshAddins" /t REG_DWORD /d 1 /f >nul
if exist "%TARGET_DIR%\manifest.xml" del /Q "%TARGET_DIR%\manifest.xml"
if exist "%TARGET_DIR%" rd "%TARGET_DIR%" 2>nul

echo  Uninstallation complete.
echo.
pause
exit /b 0
