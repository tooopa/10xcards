/* eslint-env node */
/* eslint-disable no-console */

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const projectRoot = new URL("..", import.meta.url).pathname;
const allowExtensions = new Set([".ts", ".tsx", ".astro", ".css"]);
const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", ".next", ".output"]);

const bannedRules = [
  { pattern: /bg-white/, hint: "Użyj klas opartych o tokeny (np. bg-card)." },
  { pattern: /text-slate-\d+/i, hint: "Zastąp text-slate-* tokenami (np. text-muted-foreground)." },
  { pattern: /text-gray-\d+/i, hint: "Zastąp text-gray-* tokenami." },
  { pattern: /bg-(green|red|orange|yellow|emerald|blue)-\d+/i, hint: "Użyj klas z tokens (np. color-success-soft)." },
  { pattern: /border-(green|red|orange|yellow|emerald|blue)-\d+/i, hint: "Użyj borderów opartych o tokens." },
];

const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!allowExtensions.has(extname(entry.name))) continue;

    const content = await readFile(fullPath, "utf8");
    checkFile(fullPath, content);
  }
}

function checkFile(filePath, content) {
  for (const rule of bannedRules) {
    if (rule.pattern.test(content)) {
      violations.push({ filePath, pattern: rule.pattern, hint: rule.hint });
    }
  }
}

try {
  await walk(projectRoot);
} catch (error) {
  console.error("[check-design-tokens] Nie udało się przeskanować plików:", error);
  process.exit(1);
}

if (violations.length > 0) {
  console.error("⚠️  Wykryto bezpośrednie użycia kolorów spoza systemu tokenów:\n");
  for (const violation of violations) {
    console.error(`- ${violation.filePath}`);
    console.error(`  Wzorzec: ${violation.pattern}`);
    if (violation.hint) {
      console.error(`  Wskazówka: ${violation.hint}`);
    }
    console.error("");
  }
  console.error("Usuń powyższe wystąpienia lub zastąp je tokenami z `src/styles/global.css`.");
  process.exit(1);
}

console.log("✅ Brak niedozwolonych kolorów spoza systemu tokenów.");
