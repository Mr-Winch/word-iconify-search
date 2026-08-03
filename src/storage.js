const DEFAULT_STATE = Object.freeze({
  query: "",
  format: "svg",
  insertSize: 72,
  pngResolution: 256,
  color: "#2B579A",
  preserveColors: false,
  resultLimit: 120,
  zoom: 60,
  preserveSelection: true,
  activePanel: "iconsPanel",
  filters: {
    category: "all",
    palette: "all",
    style: "all",
    license: "all",
    grid: "all",
    similar: true
  },
  collections: { useAll: true, prefixes: [] }
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function normalizeState(value = {}) {
  const filters = value.filters || {};
  const collections = value.collections || {};
  return {
    ...DEFAULT_STATE,
    query: "",
    format: value.format === "png" ? "png" : "svg",
    insertSize: clamp(value.insertSize, 12, 720, DEFAULT_STATE.insertSize),
    pngResolution: clamp(value.pngResolution, 32, 2048, DEFAULT_STATE.pngResolution),
    color: /^#[0-9a-f]{6}$/i.test(value.color || "") ? value.color.toUpperCase() : DEFAULT_STATE.color,
    preserveColors: Boolean(value.preserveColors),
    resultLimit: clamp(value.resultLimit, 24, 999, DEFAULT_STATE.resultLimit),
    zoom: clamp(value.zoom, 36, 112, DEFAULT_STATE.zoom),
    preserveSelection: value.preserveSelection !== false,
    activePanel: value.activePanel === "filtersPanel" ? "filtersPanel" : "iconsPanel",
    filters: {
      category: String(filters.category || "all"),
      palette: ["all", "mono", "color"].includes(filters.palette) ? filters.palette : "all",
      style: ["all", "fill", "stroke", "mixed", "color"].includes(filters.style) ? filters.style : "all",
      license: String(filters.license || "all"),
      grid: String(filters.grid || "all"),
      similar: filters.similar !== false
    },
    collections: {
      useAll: collections.useAll !== false,
      prefixes: Array.isArray(collections.prefixes)
        ? [...new Set(collections.prefixes.filter((item) => typeof item === "string"))]
        : []
    }
  };
}

function storageKey() {
  const partition = globalThis.Office?.context?.partitionKey || "";
  return `${partition}iconify-search-word-v1`;
}

export function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(storageKey()) || "{}"));
  } catch {
    return normalizeState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(normalizeState(state)));
  } catch {
    // A blocked storage partition should not prevent searching or inserting.
  }
}

export { DEFAULT_STATE };

