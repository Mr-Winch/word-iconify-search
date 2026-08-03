import test from "node:test";
import assert from "node:assert/strict";
import { normalizeState } from "../src/storage.js";

test("uses Word-friendly defaults", () => {
  const state = normalizeState();
  assert.equal(state.resultLimit, 120);
  assert.equal(state.format, "svg");
  assert.equal(state.insertSize, 72);
  assert.equal(state.collections.useAll, true);
});

test("clamps persisted numeric settings", () => {
  const state = normalizeState({ insertSize: 9999, resultLimit: 1, zoom: 500, color: "bad" });
  assert.equal(state.insertSize, 720);
  assert.equal(state.resultLimit, 24);
  assert.equal(state.zoom, 112);
  assert.equal(state.color, "#2B579A");
});

test("deduplicates persisted collection prefixes", () => {
  const state = normalizeState({ collections: { useAll: false, prefixes: ["mdi", "mdi", "tabler"] } });
  assert.deepEqual(state.collections.prefixes, ["mdi", "tabler"]);
});


test("preserves normalized favorites and the favorites panel", () => {
  const state = normalizeState({
    activePanel: "favoritesPanel",
    favorites: { sections: [{ id: "nav", name: "Navigation", icons: ["tabler:home", "tabler:home"] }] }
  });
  assert.equal(state.activePanel, "favoritesPanel");
  assert.deepEqual(state.favorites.sections[0].icons, ["tabler:home"]);
});
