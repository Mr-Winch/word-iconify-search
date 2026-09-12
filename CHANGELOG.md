# Changelog

## 1.0.1 — 2026-09-12

- Added XMLHttpRequest and JSONP transports when WebView2 cannot use `fetch` with Iconify.
- Added a direct icon-data fallback that reconstructs safe SVG markup for preview and insertion.
- Preserved Iconify's three official API hosts and existing SVG sanitization.

## 1.0.0 — 2026-08-24

- Promoted the complete Word add-in to its first stable public version.
- Aligned package metadata, manifests, task-pane UI, documentation, installers, package names, and changelog on version 1.0.0.
- Added reproducible ZIP packaging and SHA-256 checksum generation.
- Added release identity and package-content tests.
- Added GitHub Actions validation for tests, manifests, production builds, packages, and checksums.
- Preserved both the one-click per-user installer and script-free Office upload method.

## 0.2.2 — 2026-08-03

- Restored the CMD installer without automatically launching Word.

## 0.2.1 — 2026-08-03

- Fixed favorites section controls and the safe installation flow.

## 0.2.0 — 2026-08-03

- Added persistent favorites organized into named sections.

## 0.1.1 — 2026-08-03

- Replaced the PowerShell installer with a transparent CMD installer.

## 0.1.0 — 2026-08-03

- Initial public release.
