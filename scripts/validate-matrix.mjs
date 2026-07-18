#!/usr/bin/env node
// Validates docs/compatibility-matrix.json against the project's expected
// shape. Wired into CI so the matrix is a checked, "published" artifact rather
// than an orphan JSON file. Exits non-zero on the first problem found.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "docs", "compatibility-matrix.json");

const VALID_STATUS = new Set(["implemented", "alpha", "none"]);
const VALID_TESTED = new Set(["unit", "live-optional"]);

function fail(message) {
  console.error(`✗ compatibility-matrix: ${message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (err) {
  fail(`invalid JSON: ${err.message}`);
}

if (!data.name || !data.name.includes("openharness")) {
  fail(`name must reference openharness (got: ${JSON.stringify(data.name)})`);
}
if (!data.schemaVersion) fail("missing schemaVersion");
if (!Array.isArray(data.harnesses) || data.harnesses.length === 0) {
  fail("harnesses must be a non-empty array");
}
if (!Array.isArray(data.providers) || data.providers.length === 0) {
  fail("providers must be a non-empty array");
}
if (!data.matrix || typeof data.matrix !== "object") fail("missing matrix object");

const { harnesses, providers } = data;
let entries = 0;
for (const harness of harnesses) {
  if (!data.matrix[harness]) fail(`matrix missing harness "${harness}"`);
  const row = data.matrix[harness];
  let defaultCount = 0;
  for (const provider of providers) {
    if (!row[provider]) fail(`matrix[${harness}][${provider}] missing`);
    const cell = row[provider];
    if (!VALID_STATUS.has(cell.status)) {
      fail(`matrix[${harness}][${provider}].status invalid: ${cell.status}`);
    }
    if (!VALID_TESTED.has(cell.tested)) {
      fail(`matrix[${harness}][${provider}].tested invalid: ${cell.tested}`);
    }
    if (typeof cell.default !== "boolean") {
      fail(`matrix[${harness}][${provider}].default must be boolean`);
    }
    if (cell.default && cell.status === "none") {
      fail(`matrix[${harness}][${provider}] is default but status is none`);
    }
    if (cell.default) defaultCount += 1;
    entries += 1;
  }
  if (defaultCount > 1) fail(`harness "${harness}" declares more than one default provider`);
}

console.log(
  `✓ compatibility-matrix valid: ${harnesses.length} harnesses × ${providers.length} providers = ${entries} entries`,
);
