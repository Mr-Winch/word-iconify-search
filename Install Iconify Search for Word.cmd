@echo off
setlocal EnableExtensions
title Install Iconify Search for Word

set "ADDIN_ID=7f3bf54a-0d0e-4840-ade6-c630c5b7c22e"
set "SOURCE=%~dp0manifest.xml"
set "TARGET_DIR=%LOCALAPPDATA%\Iconify Search for Word"
set "TARGET=%TARGET_DIR%\manifest.xml"
set "DEV_KEY=HKCU\SOFTWARE\Microsoft\Office\16.0\Wef\Developer"
set "OFFICE_EXE="

echo.
echo  Iconify Search for Word
echo  -----------------------
echo.

if not exist "%SOURCE%" goto missing

tasklist /FI "IMAGENAME eq WINWORD.EXE" 2>nul | find /I "WINWORD.EXE" >nul
if not errorlevel 1 goto running

for /f "skip=2 tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE" /ve 2^>nul') do if /I "%%A"=="REG_SZ" set "OFFICE_EXE=%%B"
if not defined OFFICE_EXE for /f "skip=2 tokens=2,*" %%A in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE" /ve 2^>nul') do if /I "%%A"=="REG_SZ" set "OFFICE_EXE=%%B"
if not defined OFFICE_EXE if exist "%ProgramFiles%\Microsoft Office\root\Office16\WINWORD.EXE" set "OFFICE_EXE=%ProgramFiles%\Microsoft Office\root\Office16\WINWORD.EXE"
if not defined OFFICE_EXE if exist "%ProgramFiles(x86)%\Microsoft Office\root\Office16\WINWORD.EXE" set "OFFICE_EXE=%ProgramFiles(x86)%\Microsoft Office\root\Office16\WINWORD.EXE"
if not defined OFFICE_EXE goto nooffice

if not exist "%ProgramFiles%\Microsoft\EdgeWebView\Application" if not exist "%ProgramFiles(x86)%\Microsoft\EdgeWebView\Application" if not exist "%LOCALAPPDATA%\Microsoft\EdgeWebView\Application" goto webview

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
if errorlevel 1 goto failed
copy /Y "%SOURCE%" "%TARGET%" >nul
if errorlevel 1 goto failed

reg add "%DEV_KEY%" /v "%ADDIN_ID%" /t REG_SZ /d "%TARGET%" /f >nul
if errorlevel 1 goto failed
reg add "%DEV_KEY%" /v "RefreshAddins" /t REG_DWORD /d 1 /f >nul
if errorlevel 1 goto failed

echo  Installation complete!
echo.
echo  Word will now open.
echo  Choose Home ^> Iconify ^> Search Icons.
echo.
echo  Installed in:
echo  %TARGET_DIR%
echo.
start "" "%OFFICE_EXE%"
pause
exit /b 0

:running
echo  INSTALLATION PAUSED
echo.
echo  Close every Word window, then run this installer again.
goto end_error

:missing
echo  INSTALLATION COULD NOT START
echo.
echo  Extract the complete ZIP and keep manifest.xml beside this installer.
goto end_error

:nooffice
echo  MICROSOFT WORD WAS NOT FOUND
echo.
echo  Install Microsoft 365 or Word, then run this installer again.
goto end_error

:webview
echo  MICROSOFT EDGE WEBVIEW2 IS REQUIRED
echo.
echo  Download it directly from Microsoft, install it, then rerun this installer:
echo  https://developer.microsoft.com/microsoft-edge/webview2/
goto end_error

:failed
echo  INSTALLATION FAILED
echo.
echo  Windows could not copy or register the add-in for this user.

:end_error
echo.
pause
exit /b 1
