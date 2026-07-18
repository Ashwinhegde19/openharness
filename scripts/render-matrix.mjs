#!/usr/bin/env node
// Renders docs/compatibility-matrix.json into a human-readable table at
// docs/compatibility-matrix.md so the matrix is actually "published" (surfaced
// for humans), not just machine-readable. Run after editing the JSON:
//   pnpm matrix:render

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "docs", "compatibility-matrix.json"), "utf8"));

const { harnesses, providers } = data;
const statusGlyph = { implemented: "✅", alpha: "🟡", none: "—" };

function cell(harness, provider) {
  const cellData = data.matrix[harness][provider];
  const glyph = statusGlyph[cellData.status] ?? cellData.status;
  const def = cellData.default ? " **(default)**" : "";
  const tested = cellData.tested === "live-optional" ? "live" : "unit";
  return `${glyph} ${cellData.status}${def} · ${tested}`;
}

const header = ["Harness", ...providers.map((p) => `**${p}**`)].join(" | ");
const separator = ["---", ...providers.map(() => "---")].join(" | ");
const rows = harnesses.map((h) => [h, ...providers.map((p) => cell(h, p))].join(" | "));

const notes = harnesses
  .flatMap((h) => providers.map((p) => `- **${h} / ${p}**: ${data.matrix[h][p].notes}`))
  .join("\n");

const md =
  `# openharness compatibility matrix\n\n` +
  `> Generated from [compatibility-matrix.json](./compatibility-matrix.json). ` +
  `Re-run \`pnpm matrix:render\` after editing the JSON.\n\n` +
  `Legend: ✅ implemented · 🟡 alpha · — none. ` +
  `\`tested\` is \`unit\` (offline unit tests) or \`live\` (optional live E2E that skips without keys).\n\n` +
  `| ${header} |\n| ${separator} |\n| ${rows.join(" |\n| ")} |\n\n` +
  `## Notes\n\n${notes}\n`;

writeFileSync(join(root, "docs", "compatibility-matrix.md"), md, "utf8");
console.log(`✓ wrote docs/compatibility-matrix.md (${harnesses.length}×${providers.length})`);
