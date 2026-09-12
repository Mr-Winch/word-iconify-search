import test from "node:test";
import assert from "node:assert/strict";
import {
  classifySvgMarkup,
  filterCollections,
  normalizeCollection,
  parseIconName,
  renderIconSetSvg,
  requestWithJsonp
} from "../src/iconify.js";

test("parses Iconify icon identifiers", () => {
  assert.deepEqual(parseIconName("tabler:home"), { prefix: "tabler", name: "home" });
  assert.deepEqual(parseIconName("mdi-account"), { prefix: "mdi", name: "account" });
});

test("normalizes and filters collection metadata", () => {
  const collections = [
    normalizeCollection("tabler", { name: "Tabler Icons", total: 10, height: 24, category: "General", license: { spdx: "MIT" } }),
    normalizeCollection("logos", { name: "Logos", total: 5, palette: true, height: 32, category: "Brands", license: { title: "CC BY 4.0" } })
  ];
  assert.equal(filterCollections(collections, { palette: "mono" }, "").length, 1);
  assert.equal(filterCollections(collections, { category: "Brands" }, "").at(0).prefix, "logos");
  assert.equal(filterCollections(collections, {}, "tabler").at(0).prefix, "tabler");
});

test("classifies common SVG styles", () => {
  assert.equal(classifySvgMarkup('<svg><path fill="currentColor"/></svg>'), "fill");
  assert.equal(classifySvgMarkup('<svg fill="none"><path stroke="currentColor"/></svg>'), "stroke");
  assert.equal(classifySvgMarkup('<svg><path fill="#f00"/><path fill="#0f0"/></svg>'), "color");
});

test("renders SVG from Iconify data for the script transport fallback", () => {
  const svg = renderIconSetSvg({
    prefix: "demo",
    width: 24,
    height: 24,
    icons: { home: { body: '<path fill="currentColor" d="M0 0h24v24z"/>' } }
  }, "home", { preserveColors: false, color: "#123456" });
  assert.match(svg, /^<svg\b/);
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /fill="#123456"/);
});

test("uses Iconify's JavaScript endpoint for the script transport fallback", async () => {
  let requestedUrl;
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    head: {
      append(script) {
        requestedUrl = new URL(script.src);
        queueMicrotask(() => globalThis[requestedUrl.searchParams.get("callback")]({ ok: true }));
      }
    }
  };
  try {
    assert.deepEqual(
      await requestWithJsonp("https://api.iconify.design/tabler.json?icons=home"),
      { ok: true }
    );
  } finally {
    globalThis.document = originalDocument;
  }
  assert.equal(requestedUrl.pathname, "/tabler.js");
  assert.match(requestedUrl.searchParams.get("callback"), /^iconifySearch\d+$/);
});
