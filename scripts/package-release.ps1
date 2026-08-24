$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$metadata = Get-Content -Raw -LiteralPath (Join-Path $root "package.json") | ConvertFrom-Json
$archiveName = "Iconify-Search-for-Word-v$($metadata.version).zip"
$outputDirectory = Join-Path $root "release"
$archivePath = Join-Path $outputDirectory $archiveName
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("iconify-word-package-" + [guid]::NewGuid().ToString("N"))
$files = @(
  "Install Iconify Search for Word.cmd",
  "Uninstall Iconify Search for Word.cmd",
  "manifest.xml",
  "INSTALLATION.txt",
  "README.md",
  "CHANGELOG.md",
  "LICENSE"
)

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
New-Item -ItemType Directory -Path $staging | Out-Null

try {
  foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $staging $file)
  }

  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $archivePath -CompressionLevel Optimal -Force

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $entries = @($archive.Entries | ForEach-Object { $_.FullName })
    $missing = @($files | Where-Object { $_ -notin $entries })
    $unexpected = @($entries | Where-Object { $_ -notin $files })
    if ($missing.Count -or $unexpected.Count) {
      throw "Package content mismatch. Missing: $($missing -join ', '); unexpected: $($unexpected -join ', ')"
    }
  }
  finally {
    $archive.Dispose()
  }

  $checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath "$archivePath.sha256" -Value "$checksum  $archiveName" -Encoding ascii
  Write-Output $archivePath
  Write-Output "$archivePath.sha256"
}
finally {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
