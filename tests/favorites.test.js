import test from "node:test";
import assert from "node:assert/strict";
import {
  addIconToFavoriteSection,
  createFavoriteSection,
  favoriteIconCount,
  isFavoriteIcon,
  normalizeFavorites,
  removeFavoriteSection,
  removeIconFromFavoriteSection
} from "../src/favorites.js";

test("normalizes favorites and removes duplicate icons", () => {
  const favorites = normalizeFavorites({ sections: [{ id: "work", name: " Work ", icons: ["tabler:home", "tabler:home", "bad"] }] });
  assert.deepEqual(favorites.sections[0], { id: "work", name: "Work", icons: ["tabler:home"] });
});

test("creates sections and adds an icon once", () => {
  const created = createFavoriteSection({}, "Navigation", "navigation");
  const first = addIconToFavoriteSection(created.favorites, "navigation", "tabler:home");
  const second = addIconToFavoriteSection(first.favorites, "navigation", "tabler:home");
  assert.equal(first.added, true);
  assert.equal(second.added, false);
  assert.equal(favoriteIconCount(second.favorites), 1);
  assert.equal(isFavoriteIcon(second.favorites, "tabler:home"), true);
});

test("removes individual icons and complete sections", () => {
  const favorites = { sections: [{ id: "a", name: "A", icons: ["tabler:home", "tabler:user"] }] };
  const withoutIcon = removeIconFromFavoriteSection(favorites, "a", "tabler:home");
  assert.deepEqual(withoutIcon.sections[0].icons, ["tabler:user"]);
  assert.deepEqual(removeFavoriteSection(withoutIcon, "a").sections, []);
});