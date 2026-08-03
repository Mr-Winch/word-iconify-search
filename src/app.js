import {
  browseCollection,
  classifySvgMarkup,
  fetchIconSvg,
  filterCollections,
  listCollections,
  parseIconName,
  searchIcons
} from "./iconify.js";
import { loadState, normalizeState, saveState } from "./storage.js";
import {
  applyOfficeTheme,
  buildThemeColorRows,
  getDocumentThemeColors,
  insertIconsIntoWord,
  WORD_STANDARD_COLORS,
  watchOfficeTheme
} from "./word.js";

const byId = (id) => document.getElementById(id);
const elements = {};
let state;
let collections = [];
let visibleCollections = [];
let resultItems = [];
let selected = new Map();
let searchToken = 0;
let searchTimer;

function cacheElements() {
  for (const id of [
    "hostStatus", "refreshThemeButton", "searchInput", "searchButton", "filtersTab", "filterMarker",
    "iconsPanel", "selectionSummary", "clearSelectionButton", "iconViewport", "emptyState", "iconGrid",
    "spinner", "resultsStatus", "filtersPanel", "resetFiltersButton", "collectionSearch",
    "allCollectionsButton", "visibleCollectionsButton", "noCollectionsButton", "collectionList",
    "categoryFilter", "paletteFilter", "styleFilter", "licenseFilter", "gridFilter", "resultLimit",
    "previewZoom", "similarNames", "preserveSelection", "insertCount", "insertSize", "colorPickerWrap",
    "colorButton", "colorSwatch", "colorValue", "colorPalette", "themeBaseColors", "themeShadeColors",
    "standardColorGrid", "moreColorsButton", "customColorInput", "pngResolutionField", "pngResolution",
    "preserveColors", "licenseLine", "insertButton", "toastRegion"
  ]) elements[id] = byId(id);
  elements.pivots = [...document.querySelectorAll(".pivot-button")];
  elements.formatButtons = [...document.querySelectorAll("[data-format]")];
}

function persist() {
  saveState(state);
}

function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = "toast" + (error ? " is-error" : "");
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), error ? 6500 : 3200);
}

function setBusy(busy, status) {
  elements.spinner.hidden = !busy;
  elements.searchButton.disabled = busy;
  if (status) elements.resultsStatus.textContent = status;
}

function setPanel(panelId, remember = true) {
  const target = panelId === "filtersPanel" ? "filtersPanel" : "iconsPanel";
  elements.iconsPanel.hidden = target !== "iconsPanel";
  elements.filtersPanel.hidden = target !== "filtersPanel";
  for (const button of elements.pivots) {
    const active = button.dataset.panel === target;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  }
  if (remember) {
    state.activePanel = target;
    persist();
  }
}

function updateColorControl() {
  elements.colorSwatch.style.backgroundColor = state.color;
  elements.colorValue.textContent = state.color;
  elements.customColorInput.value = state.color;
  elements.colorButton.setAttribute("aria-label", "Icon color " + state.color);
  elements.colorButton.disabled = state.preserveColors;
  elements.colorPickerWrap.classList.toggle("is-disabled", state.preserveColors);
  if (state.preserveColors) setColorPaletteOpen(false);
}

function applyStateToControls() {
  elements.searchInput.value = state.query;
  elements.insertSize.value = state.insertSize;
  elements.pngResolution.value = state.pngResolution;
  elements.preserveColors.checked = state.preserveColors;
  updateColorControl();
  elements.resultLimit.value = state.resultLimit;
  elements.previewZoom.value = state.zoom;
  elements.similarNames.checked = state.filters.similar;
  elements.preserveSelection.checked = state.preserveSelection;
  elements.paletteFilter.value = state.filters.palette;
  elements.styleFilter.value = state.filters.style;
  document.documentElement.style.setProperty("--preview-size", state.zoom + "px");
  for (const button of elements.formatButtons) {
    const active = button.dataset.format === state.format;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  elements.pngResolutionField.hidden = state.format !== "png";
  setPanel(state.activePanel, false);
  updateSelectionUi();
}

function collectionFiltersActive() {
  const filters = state.filters;
  return filters.category !== "all"
    || filters.palette !== "all"
    || filters.style !== "all"
    || filters.license !== "all"
    || filters.grid !== "all"
    || !filters.similar
    || !state.collections.useAll
    || state.resultLimit !== 120
    || state.zoom !== 60;
}

function updateFilterMarker() {
  const active = collectionFiltersActive();
  elements.filterMarker.hidden = !active;
  elements.filtersTab.title = active ? "Filters are active" : "No active filters";
}

function colorSwatch(color, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "palette-swatch";
  button.dataset.color = color;
  button.style.backgroundColor = color;
  button.title = label + " · " + color;
  button.setAttribute("aria-label", label + " " + color);
  button.setAttribute("aria-pressed", String(color === state.color));
  if (color === state.color) button.classList.add("is-selected");
  return button;
}

function renderColorPalette(themeColors) {
  const rows = buildThemeColorRows(themeColors);
  elements.themeBaseColors.replaceChildren(...rows[0].map((color, index) => colorSwatch(color, "Theme color " + (index + 1))));
  elements.themeShadeColors.replaceChildren(...rows.slice(1).flatMap((row, rowIndex) =>
    row.map((color, columnIndex) => colorSwatch(color, "Theme color " + (columnIndex + 1) + ", shade " + (rowIndex + 1)))
  ));
  elements.standardColorGrid.replaceChildren(...WORD_STANDARD_COLORS.map((color, index) =>
    colorSwatch(color, "Standard color " + (index + 1))
  ));
}

function setColorPaletteOpen(open) {
  const next = Boolean(open) && !state.preserveColors;
  elements.colorPalette.hidden = !next;
  elements.colorButton.setAttribute("aria-expanded", String(next));
  elements.colorPickerWrap.classList.toggle("is-open", next);
}

function chooseIconColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || "")) return;
  state.color = color.toUpperCase();
  updateColorControl();
  const themeColors = [...elements.themeBaseColors.children].map((item) => item.dataset.color);
  renderColorPalette(themeColors);
  persist();
  setColorPaletteOpen(false);
}

async function openColorPalette() {
  const opening = elements.colorPalette.hidden;
  setColorPaletteOpen(opening);
  if (!opening) return;
  elements.colorButton.classList.add("is-loading");
  const colors = await getDocumentThemeColors();
  if (!elements.colorPalette.hidden) renderColorPalette(colors);
  elements.colorButton.classList.remove("is-loading");
}

function populateSelect(select, values, selectedValue, labeler = (value) => value) {
  const first = select.options[0];
  select.replaceChildren(first);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = labeler(value);
    select.append(option);
  }
  select.value = [...select.options].some((option) => option.value === String(selectedValue))
    ? String(selectedValue)
    : "all";
}

function populateCatalogFilters() {
  const categories = [...new Set(collections.flatMap((item) => item.category))].sort();
  const licenses = [...new Set(collections.map((item) => item.license.spdx || item.license.title).filter(Boolean))].sort();
  const grids = [...new Set(collections.map((item) => item.height).filter(Boolean))].sort((a, b) => a - b);
  populateSelect(elements.categoryFilter, categories, state.filters.category);
  populateSelect(elements.licenseFilter, licenses, state.filters.license);
  populateSelect(elements.gridFilter, grids, state.filters.grid, (value) => value + " px");
  state.filters.category = elements.categoryFilter.value;
  state.filters.license = elements.licenseFilter.value;
  state.filters.grid = elements.gridFilter.value;
}

function renderCollections() {
  visibleCollections = filterCollections(collections, state.filters, elements.collectionSearch.value);
  const fragment = document.createDocumentFragment();
  for (const collection of visibleCollections) {
    const row = document.createElement("label");
    row.className = "collection-item";
    row.title = collection.name + " [" + collection.prefix + "]";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.prefix = collection.prefix;
    checkbox.checked = state.collections.useAll || state.collections.prefixes.includes(collection.prefix);
    const name = document.createElement("span");
    name.textContent = collection.name + " [" + collection.prefix + "]";
    const count = document.createElement("small");
    count.textContent = collection.total.toLocaleString();
    row.append(checkbox, name, count);
    fragment.append(row);
  }
  elements.collectionList.replaceChildren(fragment);
  updateFilterMarker();
}

function effectivePrefixes() {
  const filtered = filterCollections(collections, state.filters);
  if (state.collections.useAll) {
    const metadataFilter = state.filters.category !== "all"
      || state.filters.palette !== "all"
      || state.filters.license !== "all"
      || state.filters.grid !== "all";
    return metadataFilter ? filtered.map((item) => item.prefix) : [];
  }
  const allowed = new Set(filtered.map((item) => item.prefix));
  return state.collections.prefixes.filter((prefix) => allowed.has(prefix));
}

function updateSelectionUi() {
  const count = selected.size;
  elements.selectionSummary.textContent = count ? count + (count === 1 ? " icon selected" : " icons selected") : "No icons selected";
  elements.insertCount.textContent = count ? count + (count === 1 ? " icon ready" : " icons ready") : "Select one or more icons";
  elements.clearSelectionButton.disabled = count === 0;
  elements.insertButton.disabled = count === 0;
  elements.insertButton.textContent = count ? "Insert " + count + (count === 1 ? " icon" : " icons") : "Insert icons";
  for (const tile of elements.iconGrid.querySelectorAll(".icon-tile")) {
    const active = selected.has(tile.dataset.name);
    tile.classList.toggle("is-selected", active);
    tile.setAttribute("aria-selected", String(active));
  }

  const selectedCollections = [...new Set([...selected.values()].map((item) => item.collection).filter(Boolean))];
  if (!selectedCollections.length) {
    elements.licenseLine.textContent = "Source and license details appear after selection.";
  } else if (selectedCollections.length === 1) {
    const item = selectedCollections[0];
    elements.licenseLine.textContent = item.name + " · " + (item.license.spdx || item.license.title);
  } else {
    elements.licenseLine.textContent = selectedCollections.length + " collections selected · review each collection license";
  }
}

function toggleSelection(item) {
  if (selected.has(item.name)) selected.delete(item.name);
  else selected.set(item.name, item);
  updateSelectionUi();
}

function renderResults(items) {
  resultItems = items;
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const parsed = parseIconName(item.name);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-tile";
    button.dataset.name = item.name;
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", parsed.name + " from " + (item.collection?.name || parsed.prefix));
    button.setAttribute("aria-selected", String(selected.has(item.name)));
    button.title = item.name;
    if (selected.has(item.name)) button.classList.add("is-selected");
    const preview = document.createElement("span");
    preview.className = "preview";
    preview.innerHTML = item.svg;
    const label = document.createElement("span");
    label.className = "icon-name";
    label.textContent = parsed.name;
    button.append(preview, label);
    button.addEventListener("click", () => toggleSelection(item));
    fragment.append(button);
  }
  elements.iconGrid.replaceChildren(fragment);
  elements.emptyState.hidden = items.length > 0;
  updateSelectionUi();
}

async function loadIconItems(names, token) {
  const collectionMap = new Map(collections.map((item) => [item.prefix, item]));
  const output = new Array(names.length);
  let cursor = 0;
  async function worker() {
    while (cursor < names.length) {
      const index = cursor++;
      if (token !== searchToken) return;
      const name = names[index];
      try {
        const svg = await fetchIconSvg(name, { preserveColors: true });
        const style = classifySvgMarkup(svg);
        if (state.filters.style === "all" || state.filters.style === style) {
          const parsed = parseIconName(name);
          output[index] = { name, svg, style, collection: collectionMap.get(parsed.prefix) };
        }
      } catch {
        output[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(10, names.length) }, worker));
  return output.filter(Boolean);
}

async function runSearch() {
  window.clearTimeout(searchTimer);
  const query = elements.searchInput.value.trim();
  state.query = query;
  persist();
  const prefixes = effectivePrefixes();

  if (!state.collections.useAll && prefixes.length === 0) {
    renderResults([]);
    elements.resultsStatus.textContent = "Select at least one collection.";
    return;
  }
  if (query.length < 2 && prefixes.length !== 1) {
    renderResults([]);
    elements.resultsStatus.textContent = "Type two characters, or select one collection to browse.";
    return;
  }

  const token = ++searchToken;
  if (!state.preserveSelection) selected.clear();
  setBusy(true, query.length >= 2 ? "Searching Iconify…" : "Loading collection…");
  try {
    const response = query.length >= 2
      ? await searchIcons({ query, prefixes, limit: state.resultLimit, similar: state.filters.similar })
      : await browseCollection(prefixes[0], state.resultLimit);
    const items = await loadIconItems(response.icons, token);
    if (token !== searchToken) return;
    renderResults(items);
    const styleNote = items.length < response.icons.length ? " after style filtering" : "";
    elements.resultsStatus.textContent = items.length.toLocaleString() + " shown · " + response.total.toLocaleString() + " matches" + styleNote;
  } catch (error) {
    if (token !== searchToken) return;
    renderResults([]);
    elements.resultsStatus.textContent = "Iconify is unavailable.";
    showToast(error.message, true);
  } finally {
    if (token === searchToken) setBusy(false);
  }
}

function scheduleSearch(delay = 260) {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(runSearch, delay);
}

function syncFiltersFromControls() {
  state.filters.category = elements.categoryFilter.value;
  state.filters.palette = elements.paletteFilter.value;
  state.filters.style = elements.styleFilter.value;
  state.filters.license = elements.licenseFilter.value;
  state.filters.grid = elements.gridFilter.value;
  state.filters.similar = elements.similarNames.checked;
  state.resultLimit = Number(elements.resultLimit.value);
  state.zoom = Number(elements.previewZoom.value);
  document.documentElement.style.setProperty("--preview-size", state.zoom + "px");
  persist();
  renderCollections();
  updateFilterMarker();
  if (state.query.trim().length >= 2 || effectivePrefixes().length === 1) scheduleSearch();
}

function resetFilters() {
  state = normalizeState({
    ...state,
    resultLimit: 120,
    zoom: 60,
    filters: {},
    collections: { useAll: true, prefixes: [] }
  });
  applyStateToControls();
  populateCatalogFilters();
  renderCollections();
  persist();
  if (state.query.trim().length >= 2) scheduleSearch(0);
}

function bindEvents() {
  elements.pivots.forEach((button) => button.addEventListener("click", () => setPanel(button.dataset.panel)));
  elements.refreshThemeButton.addEventListener("click", () => {
    applyOfficeTheme();
    showToast("Word theme refreshed.");
  });
  elements.searchButton.addEventListener("click", runSearch);
  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    persist();
    if (state.query.trim().length >= 2) scheduleSearch();
  });
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runSearch();
  });
  elements.clearSelectionButton.addEventListener("click", () => {
    selected.clear();
    updateSelectionUi();
  });
  elements.collectionSearch.addEventListener("input", renderCollections);
  elements.collectionList.addEventListener("change", (event) => {
    const prefix = event.target.dataset.prefix;
    if (!prefix) return;
    state.collections.useAll = false;
    const values = new Set(state.collections.prefixes);
    if (event.target.checked) values.add(prefix);
    else values.delete(prefix);
    state.collections.prefixes = [...values];
    persist();
    renderCollections();
    if (state.query.trim().length >= 2 || effectivePrefixes().length === 1) scheduleSearch();
  });
  elements.allCollectionsButton.addEventListener("click", () => {
    state.collections = { useAll: true, prefixes: [] };
    persist();
    renderCollections();
    if (state.query.trim().length >= 2) scheduleSearch();
  });
  elements.visibleCollectionsButton.addEventListener("click", () => {
    state.collections = { useAll: false, prefixes: visibleCollections.map((item) => item.prefix) };
    persist();
    renderCollections();
    if (state.query.trim().length >= 2 || effectivePrefixes().length === 1) scheduleSearch();
  });
  elements.noCollectionsButton.addEventListener("click", () => {
    state.collections = { useAll: false, prefixes: [] };
    persist();
    renderCollections();
    renderResults([]);
    elements.resultsStatus.textContent = "Select at least one collection.";
  });
  elements.resetFiltersButton.addEventListener("click", resetFilters);
  for (const element of [
    elements.categoryFilter, elements.paletteFilter, elements.styleFilter,
    elements.licenseFilter, elements.gridFilter, elements.similarNames
  ]) element.addEventListener("change", syncFiltersFromControls);
  elements.resultLimit.addEventListener("change", syncFiltersFromControls);
  elements.previewZoom.addEventListener("input", syncFiltersFromControls);
  elements.preserveSelection.addEventListener("change", () => {
    state.preserveSelection = elements.preserveSelection.checked;
    persist();
  });
  elements.formatButtons.forEach((button) => button.addEventListener("click", () => {
    state.format = button.dataset.format;
    applyStateToControls();
    persist();
  }));
  elements.insertSize.addEventListener("change", () => {
    state.insertSize = Number(elements.insertSize.value);
    state = normalizeState(state);
    elements.insertSize.value = state.insertSize;
    persist();
  });
  elements.pngResolution.addEventListener("change", () => {
    state.pngResolution = Number(elements.pngResolution.value);
    state = normalizeState(state);
    elements.pngResolution.value = state.pngResolution;
    persist();
  });
  elements.colorButton.addEventListener("click", openColorPalette);
  elements.colorPalette.addEventListener("click", (event) => {
    const swatch = event.target.closest("[data-color]");
    if (swatch) chooseIconColor(swatch.dataset.color);
  });
  elements.moreColorsButton.addEventListener("click", () => elements.customColorInput.click());
  elements.customColorInput.addEventListener("input", () => chooseIconColor(elements.customColorInput.value));
  document.addEventListener("pointerdown", (event) => {
    if (!elements.colorPickerWrap.contains(event.target)) setColorPaletteOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.colorPalette.hidden) {
      setColorPaletteOpen(false);
      elements.colorButton.focus();
    }
  });
  elements.preserveColors.addEventListener("change", () => {
    state.preserveColors = elements.preserveColors.checked;
    updateColorControl();
    persist();
  });
  elements.insertButton.addEventListener("click", insertSelected);
}

async function insertSelected() {
  const names = [...selected.keys()];
  if (!names.length) return;
  elements.insertButton.disabled = true;
  try {
    const items = [];
    for (let index = 0; index < names.length; index += 1) {
      elements.insertButton.textContent = "Preparing " + (index + 1) + " of " + names.length + "…";
      items.push({
        name: names[index],
        svg: await fetchIconSvg(names[index], {
          preserveColors: state.preserveColors,
          color: state.color
        })
      });
    }
    const result = await insertIconsIntoWord(items, {
      format: state.format,
      size: state.insertSize,
      pngResolution: state.pngResolution
    }, (current, total) => {
      elements.insertButton.textContent = "Inserting " + current + " of " + total + "…";
    });
    if (result.simulated) showToast("Preview mode: " + result.inserted + " icons prepared successfully.");
    else if (result.fallbackToPng) showToast("Inserted as PNG because this Word version does not support SVG insertion.");
    else showToast("Inserted " + result.inserted + (result.inserted === 1 ? " icon." : " icons."));
  } catch (error) {
    showToast(error.message, true);
  } finally {
    updateSelectionUi();
  }
}

async function initialize() {
  cacheElements();
  state = loadState();
  applyStateToControls();
  renderColorPalette([]);
  bindEvents();
  watchOfficeTheme(() => renderResults(resultItems));
  const host = globalThis.Office?.context?.host;
  elements.hostStatus.textContent = host ? "Connected to Microsoft Word" : "Browser preview · insertion is simulated";
  setBusy(true, "Loading icon collections…");
  try {
    collections = await listCollections();
    populateCatalogFilters();
    renderCollections();
    elements.resultsStatus.textContent = collections.length.toLocaleString() + " collections ready";
  } catch (error) {
    elements.resultsStatus.textContent = "Could not load icon collections.";
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

let initialized = false;
function startOnce() {
  if (initialized) return;
  initialized = true;
  initialize();
}

if (globalThis.Office?.onReady) {
  Office.onReady(startOnce);
  window.setTimeout(startOnce, 2500);
} else {
  document.addEventListener("DOMContentLoaded", startOnce, { once: true });
}
