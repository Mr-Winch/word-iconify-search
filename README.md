# Iconify Search for Word

Search the full Iconify catalog, select one or more icons, and insert them at the current Word cursor as SVG or transparent PNG.

## Features

- Native-looking Word task pane with automatic Office light/dark theme support
- Full Iconify collection browser, search filters, multi-selection, persistent settings, and adjustable preview zoom
- SVG/PNG format toggle, insertion size, PNG resolution, and an Office-style color palette
- SVG insertion with automatic PNG fallback on Word builds that do not support ImageCoercion 1.2

## Install on Windows

1. Download and extract the release ZIP.
2. Install Microsoft Word or Microsoft 365.
3. Double-click **Install Iconify Search for Word.cmd**.
4. When Word opens, choose **Home > Iconify > Search Icons**.

The installer works per Windows user, detects Word, checks the hosted HTTPS app, installs Microsoft Edge WebView2 if it is missing (with confirmation), registers the manifest, and opens Word. Internet access is required for Iconify searches.

To remove the add-in, double-click **Uninstall Iconify Search for Word.cmd**.

## Development

Requirements: Node.js 20.19 or newer and a current Word desktop installation.

```powershell
npm install
npm test
npm run validate
npm start
```

The development manifest uses `https://localhost:3000/`. The production manifest points to GitHub Pages.

## Architecture

This is an Office JavaScript task-pane add-in using an add-in-only XML manifest. The frontend is dependency-free JavaScript and CSS; development dependencies are only used for HTTPS localhost hosting, manifest validation, and sideloading.

## License

MIT. Imported icons keep the license of their source Iconify collection.