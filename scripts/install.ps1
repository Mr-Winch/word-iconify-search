[CmdletBinding()]
param([switch]$NoLaunch)

$ErrorActionPreference = "Stop"
$AddinId = "7f3bf54a-0d0e-4840-ade6-c630c5b7c22e"
$ProductName = "Iconify Search for Word"
$SourceManifest = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\manifest.xml"))
$InstallRoot = Join-Path $env:LOCALAPPDATA "Iconify Search for Word"
$InstalledManifest = Join-Path $InstallRoot "manifest.xml"
$DeveloperKey = "HKCU:\SOFTWARE\Microsoft\Office\16.0\Wef\Developer"
$ProgramFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")

function Find-Word {
  $appPathKeys = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE"
  )
  foreach ($key in $appPathKeys) {
    try {
      $value = (Get-ItemProperty -LiteralPath $key -ErrorAction Stop)."(default)"
      if ($value -and (Test-Path -LiteralPath $value)) { return $value }
    } catch {}
  }
  $known = @((Join-Path $env:ProgramFiles "Microsoft Office\root\Office16\WINWORD.EXE"))
  if ($ProgramFilesX86) { $known += Join-Path $ProgramFilesX86 "Microsoft Office\root\Office16\WINWORD.EXE" }
  return $known | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}

function Test-WebView2 {
  $paths = @(
    (Join-Path $env:ProgramFiles "Microsoft\EdgeWebView\Application"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\EdgeWebView\Application")
  )
  if ($ProgramFilesX86) { $paths += Join-Path $ProgramFilesX86 "Microsoft\EdgeWebView\Application" }
  return [bool]($paths | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1)
}

Write-Host ""
Write-Host " $ProductName" -ForegroundColor White
Write-Host " --------------------------------" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path -LiteralPath $SourceManifest)) {
  throw "manifest.xml is missing. Extract the complete ZIP before running the installer."
}

[xml]$manifest = Get-Content -LiteralPath $SourceManifest -Raw
$sourceUrl = [string]$manifest.OfficeApp.DefaultSettings.SourceLocation.DefaultValue
if (-not $sourceUrl.StartsWith("https://")) {
  throw "The production add-in URL in manifest.xml is invalid."
}

$wordApp = Find-Word
if (-not $wordApp) {
  throw "Microsoft Word was not found. Install Microsoft 365 or Word, then run this installer again."
}

if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
  Write-Host " Close every Word window, then press Enter." -ForegroundColor Yellow
  Read-Host | Out-Null
  if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
    throw "Word is still open. Close it and run the installer again."
  }
}

Write-Host " Checking the hosted add-in..."
try {
  Invoke-WebRequest -Uri $sourceUrl -Method Head -UseBasicParsing -TimeoutSec 15 | Out-Null
} catch {
  throw "The hosted add-in is not reachable at $sourceUrl. Check the internet connection or download a newer release."
}

if (-not (Test-WebView2)) {
  Write-Host ""
  Write-Host " Microsoft Edge WebView2 Runtime was not detected." -ForegroundColor Yellow
  $answer = Read-Host " Install Microsoft's WebView2 Runtime now? [Y/n]"
  if ($answer -notmatch "^[Nn]") {
    $bootstrapper = Join-Path $env:TEMP "MicrosoftEdgeWebview2Setup.exe"
    Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -OutFile $bootstrapper -UseBasicParsing
    $process = Start-Process -FilePath $bootstrapper -ArgumentList "/silent", "/install" -Wait -PassThru
    if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
      throw "WebView2 installation failed with exit code $($process.ExitCode)."
    }
  } else {
    throw "WebView2 is required to display the add-in."
  }
}

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
Copy-Item -LiteralPath $SourceManifest -Destination $InstalledManifest -Force
Unblock-File -LiteralPath $InstalledManifest -ErrorAction SilentlyContinue
New-Item -Path $DeveloperKey -Force | Out-Null
New-ItemProperty -Path $DeveloperKey -Name $AddinId -Value $InstalledManifest -PropertyType String -Force | Out-Null
New-ItemProperty -Path $DeveloperKey -Name "RefreshAddins" -Value 1 -PropertyType DWord -Force | Out-Null

Write-Host ""
Write-Host " Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host " 1. Word will open."
Write-Host " 2. On Home, choose Iconify > Search Icons."
Write-Host " 3. If the button is not visible yet, choose Home > Add-ins > Iconify Search once."
Write-Host ""
Write-Host " Installed for: $env:USERNAME"
Write-Host " Location: $InstallRoot"
Write-Host ""

if (-not $NoLaunch) {
  Start-Process -FilePath $wordApp
}
