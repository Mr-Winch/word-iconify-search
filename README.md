# Iconify Search for Word

Search the full Iconify catalog, select one or more icons, and insert them at the current Word cursor as SVG or transparent PNG.

Current public version: **1.0.1**.

## Features

- Native-looking Word task pane with automatic Office light/dark theme support
- Full Iconify collection browser, search filters, multi-selection, persistent settings, and adjustable preview zoom
- Favorites organized into named accordion sections, with persistent storage and per-icon or per-section deletion
- SVG/PNG format toggle, insertion size, PNG resolution, and an Office-style color palette
- SVG insertion with automatic PNG fallback on Word builds that do not support ImageCoercion 1.2

## Install on Windows

The installer is designed for a clean Windows computer and does not require Git, Node.js, npm, Python, PowerShell, or administrator access.

1. Extract the complete release ZIP.
2. Close every Word window.
3. Double-click **Install Iconify Search for Word.cmd**.
4. Close the installer when it finishes, then open Word yourself.
5. Choose **Home > Iconify > Search Icons**.

The installer intentionally does **not** launch Word; this avoids the Behavior Shield alert caused when `cmd.exe` registered the add-in and immediately opened Office. A script-free **Upload My Add-in** alternative is documented in `INSTALLATION.txt`.

To remove the add-in, close Word and double-click **Uninstall Iconify Search for Word.cmd**.

The recommended release file is `Iconify-Search-for-Word-v1.0.1.zip`. Its accompanying `.sha256` file can be checked on Windows with:

```powershell
(Get-FileHash .\Iconify-Search-for-Word-v1.0.1.zip -Algorithm SHA256).Hash
```

If security software blocks command scripts, use the script-free **Upload My Add-in** method in `INSTALLATION.txt`; it installs the same signed release manifest without running the installer.

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
