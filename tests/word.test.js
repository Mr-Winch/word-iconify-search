import test from "node:test";
import assert from "node:assert/strict";
import { buildThemeColorRows, prepareOfficeImageData } from "../src/word.js";

test("builds a Word-style Office theme palette", () => {
  const rows = buildThemeColorRows([
    "#FFFFFF", "#000000", "#EEEEEE", "#222222", "#FF0000",
    "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF"
  ]);
  assert.equal(rows.length, 6);
  assert.ok(rows.every((row) => row.length === 10));
  assert.equal(rows[0][4], "#FF0000");
  assert.match(rows[5][9], /^#[0-9A-F]{6}$/);
});

test("passes raw SVG XML to Office XmlSvg insertion", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
  assert.equal(await prepareOfficeImageData("svg", svg, 256), svg);
});
test("inserts every selected icon at the Word cursor without slide coordinates", async () => {
  const calls = [];
  globalThis.Office = {
    AsyncResultStatus: { Succeeded: "succeeded" },
    CoercionType: { XmlSvg: "xmlsvg", Image: "image" },
    context: {
      requirements: { isSetSupported: () => true },
      document: {
        setSelectedDataAsync(data, options, callback) {
          calls.push({ data, options });
          callback({ status: "succeeded" });
        }
      }
    }
  };
  const { insertIconsIntoWord } = await import("../src/word.js");
  const result = await insertIconsIntoWord([
    { name: "tabler:home", svg: "<svg/>" },
    { name: "tabler:user", svg: "<svg/>" }
  ], { format: "svg", size: 72, pngResolution: 256 });
  assert.equal(result.inserted, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.imageWidth, 72);
  assert.equal("imageLeft" in calls[0].options, false);
  assert.equal("imageTop" in calls[0].options, false);
  delete globalThis.Office;
});