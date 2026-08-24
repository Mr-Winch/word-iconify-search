import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const version = "1.0.0";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public version is aligned", () => {
  assert.equal(JSON.parse(read("package.json")).version, version);
  for (const manifest of ["manifest.xml", "manifest.local.xml"]) assert.match(read(manifest), new RegExp(`<Version>${version.replaceAll(".", "\\.")}\\.0</Version>`));
  for (const file of ["index.html", "README.md", "CHANGELOG.md", "INSTALLATION.txt", "Install Iconify Search for Word.cmd", "Uninstall Iconify Search for Word.cmd"]) assert.match(read(file), new RegExp(version.replaceAll(".", "\\.")));
});

test("release package contains install and uninstall paths", () => {
  const script = read("scripts/package-release.ps1");
  for (const file of ["Install Iconify Search for Word.cmd", "Uninstall Iconify Search for Word.cmd", "manifest.xml", "INSTALLATION.txt", "README.md", "CHANGELOG.md", "LICENSE"]) assert.match(script, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
