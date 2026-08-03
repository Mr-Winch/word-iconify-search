const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function cleanIcon(value) {
  const icon = String(value || "").trim();
  return ICON_NAME.test(icon) ? icon : "";
}

export function normalizeFavorites(value = {}) {
  const seenIds = new Set();
  const sections = [];
  for (const [index, raw] of (Array.isArray(value.sections) ? value.sections : []).entries()) {
    const name = cleanName(raw?.name);
    if (!name) continue;
    let id = String(raw?.id || `section-${index + 1}`).replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
    if (!id || seenIds.has(id)) id = `section-${index + 1}-${sections.length + 1}`;
    seenIds.add(id);
    sections.push({
      id,
      name,
      icons: [...new Set((Array.isArray(raw?.icons) ? raw.icons : []).map(cleanIcon).filter(Boolean))]
    });
  }
  return { sections };
}

export function createFavoriteSection(favorites, name, id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) {
  const normalized = normalizeFavorites(favorites);
  const clean = cleanName(name);
  if (!clean) throw new Error("Enter a section name.");
  if (normalized.sections.some((section) => section.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) {
    throw new Error("A favorites section with that name already exists.");
  }
  const section = { id: String(id), name: clean, icons: [] };
  return { favorites: { sections: [...normalized.sections, section] }, section };
}

export function addIconToFavoriteSection(favorites, sectionId, iconName) {
  const normalized = normalizeFavorites(favorites);
  const icon = cleanIcon(iconName);
  if (!icon) throw new Error("This icon name is invalid.");
  let found = false;
  let added = false;
  const sections = normalized.sections.map((section) => {
    if (section.id !== sectionId) return section;
    found = true;
    if (section.icons.includes(icon)) return section;
    added = true;
    return { ...section, icons: [...section.icons, icon] };
  });
  if (!found) throw new Error("Choose a favorites section.");
  return { favorites: { sections }, added };
}

export function removeIconFromFavoriteSection(favorites, sectionId, iconName) {
  const normalized = normalizeFavorites(favorites);
  return {
    sections: normalized.sections.map((section) => section.id === sectionId
      ? { ...section, icons: section.icons.filter((icon) => icon !== iconName) }
      : section)
  };
}

export function removeFavoriteSection(favorites, sectionId) {
  const normalized = normalizeFavorites(favorites);
  return { sections: normalized.sections.filter((section) => section.id !== sectionId) };
}

export function isFavoriteIcon(favorites, iconName) {
  return normalizeFavorites(favorites).sections.some((section) => section.icons.includes(iconName));
}

export function favoriteIconCount(favorites) {
  return normalizeFavorites(favorites).sections.reduce((total, section) => total + section.icons.length, 0);
}