const API_BASES = ["https://api.iconify.design", "https://api.simplesvg.com", "https://api.unisvg.com"];
const REQUEST_TIMEOUT = 12000;

async function request(path, asText = false) {
  const failures = [];
  for (const base of API_BASES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(base + path, {
        signal: controller.signal,
        headers: { Accept: asText ? "image/svg+xml,text/plain" : "application/json" }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return asText ? await response.text() : await response.json();
    } catch (error) {
      failures.push(base + ": " + error.message);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Could not reach Iconify. " + failures.join(" | "));
}

export function parseIconName(value) {
  const text = String(value || "").trim().replace(/^@/, "");
  const colon = text.indexOf(":");
  if (colon > 0) return { prefix: text.slice(0, colon), name: text.slice(colon + 1) };
  const dash = text.indexOf("-");
  if (dash > 0) return { prefix: text.slice(0, dash), name: text.slice(dash + 1) };
  return { prefix: "", name: text };
}

export function normalizeCollection(prefix, value = {}) {
  const license = value.license || {};
  const height = Array.isArray(value.height) ? value.height[0] : value.height;
  return {
    prefix,
    name: value.name || prefix,
    total: Number(value.total || 0),
    author: value.author || {},
    category: Array.isArray(value.category) ? value.category : value.category ? [value.category] : [],
    palette: Boolean(value.palette),
    height: Number(height || 0),
    samples: Array.isArray(value.samples) ? value.samples : [],
    license: {
      title: license.title || license.spdx || "License not specified",
      spdx: license.spdx || "",
      url: license.url || ""
    }
  };
}

const words = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function filterCollections(collections, filters = {}, text = "") {
  const needle = words(text);
  return collections.filter((item) => {
    if (needle && !words(item.name + " " + item.prefix).includes(needle)) return false;
    if (filters.category && filters.category !== "all" && !item.category.includes(filters.category)) return false;
    if (filters.palette === "mono" && item.palette) return false;
    if (filters.palette === "color" && !item.palette) return false;
    if (filters.license && filters.license !== "all"
        && (item.license.spdx || item.license.title) !== filters.license) return false;
    if (filters.grid && filters.grid !== "all" && item.height !== Number(filters.grid)) return false;
    return true;
  });
}

export async function listCollections() {
  const data = await request("/collections");
  return Object.entries(data)
    .map(([prefix, value]) => normalizeCollection(prefix, value))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchIcons({ query, prefixes = [], limit = 120, similar = true }) {
  const params = new URLSearchParams({ query: query.trim(), limit: String(Math.min(999, Math.max(1, limit))) });
  if (prefixes.length) params.set("prefixes", prefixes.join(","));
  if (similar) params.set("similar", "true");
  const data = await request("/search?" + params);
  return {
    icons: Array.isArray(data.icons) ? data.icons : [],
    total: Number(data.total || 0),
    limit: Number(data.limit || limit),
    start: Number(data.start || 0)
  };
}

export async function browseCollection(prefix, limit = 120) {
  const data = await request("/collection?" + new URLSearchParams({ prefix, chars: "true" }));
  const ordered = [];
  const append = (items) => {
    for (const name of items || []) {
      const fullName = prefix + ":" + name;
      if (!ordered.includes(fullName)) ordered.push(fullName);
    }
  };
  append(data.uncategorized);
  for (const items of Object.values(data.categories || {})) append(items);
  append(data.hidden);
  append(Object.keys(data.aliases || {}));
  return { icons: ordered.slice(0, limit), total: ordered.length, limit, start: 0 };
}

export function sanitizeSvg(svgText) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(String(svgText), "image/svg+xml");
  if (documentNode.querySelector("parsererror") || documentNode.documentElement.localName !== "svg") {
    throw new Error("Iconify returned invalid SVG.");
  }
  documentNode.querySelectorAll("script,foreignObject,iframe,object,embed").forEach((node) => node.remove());
  for (const element of documentNode.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      const key = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (key.startsWith("on")
          || ((key === "href" || key.endsWith(":href")) && value && !value.startsWith("#"))
          || /url\s*\(\s*['"]?(?:https?:|data:|\/\/)/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  const root = documentNode.documentElement;
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = (root.getAttribute("viewBox") || "0 0 24 24").trim().split(/\s+/).map(Number);
  const width = Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : 24;
  const height = Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : 24;
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  return new XMLSerializer().serializeToString(root);
}

export function classifySvgMarkup(svg) {
  const source = String(svg || "").toLowerCase();
  const colors = [...source.matchAll(/(?:fill|stroke)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => !["none", "currentcolor", "inherit", "transparent"].includes(value));
  if (new Set(colors).size > 1 || /lineargradient|radialgradient/.test(source)) return "color";
  const stroke = /stroke=["'](?!none)/.test(source);
  const fill = /fill=["'](?!none)/.test(source)
    || (!/fill=["']none/.test(source) && /<(?:path|circle|rect|polygon|ellipse)\b/.test(source));
  if (stroke && fill) return "mixed";
  return stroke ? "stroke" : "fill";
}

export async function fetchIconSvg(fullName, options = {}) {
  const { prefix, name } = parseIconName(fullName);
  if (!prefix || !name) throw new Error("Invalid Iconify name: " + fullName);
  const params = new URLSearchParams();
  if (!options.preserveColors && options.color) params.set("color", options.color);
  const query = params.size ? "?" + params : "";
  const svg = sanitizeSvg(await request(
    "/" + encodeURIComponent(prefix) + "/" + encodeURIComponent(name) + ".svg" + query,
    true
  ));
  return svg;
}

export function svgToBase64(svg) {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function svgToPngBase64(svg, pixelSize = 256) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      try {
        const size = Math.min(2048, Math.max(32, Number(pixelSize) || 256));
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, size, size);
        const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/png").split(",")[1]);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not render this SVG as PNG."));
    };
    image.src = url;
  });
}
