[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$AddinId = "7f3bf54a-0d0e-4840-ade6-c630c5b7c22e"
$InstallRoot = Join-Path $env:LOCALAPPDATA "Iconify Search for Word"
$DeveloperKey = "HKCU:\SOFTWARE\Microsoft\Office\16.0\Wef\Developer"

Write-Host ""
Write-Host " Uninstall Iconify Search for Word" -ForegroundColor White
Write-Host " ---------------------------------------" -ForegroundColor DarkGray
Write-Host ""

if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
  Write-Host " Close every Word window, then press Enter." -ForegroundColor Yellow
  Read-Host | Out-Null
  if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
    throw "Word is still open. Close it and run the uninstaller again."
  }
}

if (Test-Path -LiteralPath $DeveloperKey) {
  Remove-ItemProperty -Path $DeveloperKey -Name $AddinId -ErrorAction SilentlyContinue
  New-ItemProperty -Path $DeveloperKey -Name "RefreshAddins" -Value 1 -PropertyType DWord -Force | Out-Null
}

$expectedRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA "Iconify Search for Word"))
$resolvedRoot = [IO.Path]::GetFullPath($InstallRoot)
if ($resolvedRoot -ne $expectedRoot -or [IO.Path]::GetFileName($resolvedRoot) -ne "Iconify Search for Word") {
  throw "Safety check failed for the installation directory."
}
if (Test-Path -LiteralPath $resolvedRoot) {
  Remove-Item -LiteralPath $resolvedRoot -Recurse -Force
}

Write-Host " Uninstallation complete." -ForegroundColor Green
Write-Host " The add-in can be installed again at any time."
Write-Host ""
