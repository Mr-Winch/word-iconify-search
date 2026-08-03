import { svgToPngBase64 } from "./iconify.js";

const FALLBACK_THEME = {
  bodyBackgroundColor: "#f5f5f5",
  bodyForegroundColor: "#242424",
  controlBackgroundColor: "#ffffff",
  controlForegroundColor: "#242424"
};

function rgb(hex) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
}

function hex(values) {
  return "#" + values.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("");
}

function blend(first, second, ratio) {
  const a = rgb(first);
  const b = rgb(second);
  if (!a || !b) return first;
  return hex(a.map((value, index) => value * (1 - ratio) + b[index] * ratio));
}

function luminance(color) {
  const values = rgb(color) || [255, 255, 255];
  return values.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0) / 255;
}

const THEME_COLOR_NAMES = [
  "Light1", "Dark1", "Light2", "Dark2",
  "Accent1", "Accent2", "Accent3", "Accent4", "Accent5", "Accent6"
];

export const DEFAULT_WORD_THEME_COLORS = Object.freeze([
  "#FFFFFF", "#000000", "#E7E6E6", "#44546A", "#4472C4",
  "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"
]);

export const WORD_STANDARD_COLORS = Object.freeze([
  "#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050",
  "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"
]);

function normalizeHexColor(value, fallback) {
  const candidate = String(value || "").trim();
  const prefixed = candidate.startsWith("#") ? candidate : "#" + candidate;
  return /^#[0-9a-f]{6}$/i.test(prefixed) ? prefixed.toUpperCase() : fallback;
}

function themeShade(color, row) {
  const lightness = luminance(color);
  if (lightness > 0.86) return blend(color, "#000000", [0.06, 0.16, 0.27, 0.38, 0.52][row]);
  if (lightness < 0.14) return blend(color, "#FFFFFF", [0.82, 0.65, 0.48, 0.30, 0.12][row]);
  if (row < 3) return blend(color, "#FFFFFF", [0.82, 0.62, 0.38][row]);
  return blend(color, "#000000", [0.22, 0.44][row - 3]);
}

export function buildThemeColorRows(colors = DEFAULT_WORD_THEME_COLORS) {
  const bases = DEFAULT_WORD_THEME_COLORS.map((fallback, index) => normalizeHexColor(colors[index], fallback));
  return [
    bases,
    ...Array.from({ length: 5 }, (_, row) => bases.map((color) => themeShade(color, row).toUpperCase()))
  ];
}

export async function getDocumentThemeColors() {
  return [...DEFAULT_WORD_THEME_COLORS];
}

export function readOfficeTheme() {
  const previewTheme = new URLSearchParams(location.search).get("theme");
  const localPreview = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (localPreview && previewTheme === "dark") {
    return {
      bodyBackgroundColor: "#292929",
      bodyForegroundColor: "#f5f5f5",
      controlBackgroundColor: "#333333",
      controlForegroundColor: "#f5f5f5",
      isDarkTheme: true
    };
  }
  const supplied = globalThis.Office?.context?.officeTheme;
  return { ...FALLBACK_THEME, ...(supplied || {}) };
}

export function applyOfficeTheme() {
  const theme = readOfficeTheme();
  const dark = typeof theme.isDarkTheme === "boolean"
    ? theme.isDarkTheme
    : luminance(theme.bodyBackgroundColor) < 0.45;
  const accent = theme.fluentThemeData?.colorBrandBackground || "#2B579A";
  const background = theme.bodyBackgroundColor || FALLBACK_THEME.bodyBackgroundColor;
  const foreground = theme.bodyForegroundColor || FALLBACK_THEME.bodyForegroundColor;
  const controlBackground = theme.controlBackgroundColor || FALLBACK_THEME.controlBackgroundColor;
  const controlForeground = theme.controlForegroundColor || FALLBACK_THEME.controlForegroundColor;
  const contrastBase = dark ? "#ffffff" : "#000000";
  const root = document.documentElement;
  const variables = {
    "--office-bg": background,
    "--office-fg": foreground,
    "--office-control-bg": controlBackground,
    "--office-control-fg": controlForeground,
    "--office-muted": blend(foreground, background, 0.38),
    "--office-border": blend(background, contrastBase, dark ? 0.18 : 0.15),
    "--office-border-strong": blend(background, contrastBase, dark ? 0.32 : 0.30),
    "--office-hover": blend(background, contrastBase, dark ? 0.10 : 0.06),
    "--office-selected": blend(background, accent, dark ? 0.27 : 0.16),
    "--office-accent": accent,
    "--office-accent-hover": blend(accent, dark ? "#ffffff" : "#000000", 0.16),
    "--office-accent-text": luminance(accent) > 0.65 ? "#1b1b1b" : "#ffffff",
    "--office-shadow": dark ? "rgba(0,0,0,.34)" : "rgba(0,0,0,.12)"
  };
  for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value);
  root.dataset.theme = dark ? "dark" : "light";
  return JSON.stringify(theme);
}

export function watchOfficeTheme(onChange = () => {}) {
  let signature = applyOfficeTheme();
  const refresh = () => {
    const next = applyOfficeTheme();
    if (next !== signature) {
      signature = next;
      onChange();
    }
  };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  const timer = window.setInterval(refresh, 1500);
  return () => window.clearInterval(timer);
}

function hasWordHost() {
  return Boolean(globalThis.Office?.context?.document?.setSelectedDataAsync);
}

export function supportsSvgInsertion() {
  return Boolean(globalThis.Office?.context?.requirements?.isSetSupported?.("ImageCoercion", "1.2"));
}

function setSelectedData(data, coercionType, size) {
  return new Promise((resolve, reject) => {
    Office.context.document.setSelectedDataAsync(data, {
      coercionType,
      imageWidth: size,
      imageHeight: size
    }, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) resolve();
      else reject(new Error(result.error?.message || "Word could not insert the image."));
    });
  });
}

export async function prepareOfficeImageData(format, svg, pngResolution) {
  // Office XmlSvg expects the SVG XML itself. Passing Base64 can report
  // success while creating a broken picture placeholder in Word.
  return format === "svg" ? svg : svgToPngBase64(svg, pngResolution);
}
export async function insertIconsIntoWord(items, options, progress = () => {}) {
  if (!items.length) throw new Error("Select at least one icon.");
  if (!hasWordHost()) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { inserted: items.length, simulated: true, format: options.format };
  }

  let format = options.format;
  let fallbackToPng = false;
  if (format === "svg" && !supportsSvgInsertion()) {
    format = "png";
    fallbackToPng = true;
  }

  const size = Math.min(720, Math.max(12, Number(options.size) || 72));

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    progress(index + 1, items.length, item);
    const imageData = await prepareOfficeImageData(format, item.svg, options.pngResolution);
    await setSelectedData(imageData, format === "svg" ? Office.CoercionType.XmlSvg : Office.CoercionType.Image, size);
  }
  return { inserted: items.length, simulated: false, format, fallbackToPng };
}
