// Leonida Legend hand-in program for the gta6-trophy-guide-01 bounty.
// Written for this entry: it stages the static guide (app/) and its
// screenshots into the output directory, then asks the vendored dossier
// library to describe exactly what was staged, so the scorer can compare
// the dossier byte-for-byte with its own recomputation.
//
// Node 22 standard library only; no install step, no build step.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

// The repository root is wherever this file lives, regardless of the
// working directory the scorer launches us from.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// Make sure the output directory exists before staging anything into it.
mkdirSync(outputDir, { recursive: true });

// Stage the guide itself: the whole app/ tree, copied recursively.
cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });

// Stage the screenshots next to it; the folder always exists in the
// output even if the repository somehow has none.
const screenshotsOut = join(outputDir, "screenshots");
mkdirSync(screenshotsOut, { recursive: true });
const screenshotsIn = join(repoRoot, "screenshots");
if (existsSync(screenshotsIn)) {
  cpSync(screenshotsIn, screenshotsOut, { recursive: true });
}

// Describe the staged entry. buildDossier returns the canonical JSON
// bytes of the dossier; write them out untouched.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, "dossier.json"), dossierBytes);

console.log("Leonida Legend staged to " + outputDir + " (dossier " + dossierBytes.length + " bytes).");
