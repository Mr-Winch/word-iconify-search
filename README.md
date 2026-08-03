# Iconify Search for Word

Search the full Iconify catalog, select one or more icons, and insert them at the current Word cursor as SVG or transparent PNG.

## Features

- Native-looking Word task pane with automatic Office light/dark theme support
- Full Iconify collection browser, search filters, multi-selection, persistent settings, and adjustable preview zoom
- Favorites organized into named accordion sections, with persistent storage and per-icon or per-section deletion
- SVG/PNG format toggle, insertion size, PNG resolution, and an Office-style color palette
- SVG insertion with automatic PNG fallback on Word builds that do not support ImageCoercion 1.2

## Install on Windows

The release ZIP uses Office's built-in **Upload My Add-in** flow and contains no executable installer or Registry script.

1. Extract the release ZIP.
2. Open Word and choose **Home > Add-ins > More Add-ins**.
3. Open **My Add-ins**, then choose **Manage My Add-ins > Upload My Add-in**.
4. Select `manifest.xml` from the extracted folder.
5. Choose **Home > Iconify > Search Icons**.

Some Office builds place **Upload My Add-in** under **Advanced** or **More Settings**. See `INSTALLATION.txt` in the ZIP for the same offline instructions. Internet access is required for Iconify searches.

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