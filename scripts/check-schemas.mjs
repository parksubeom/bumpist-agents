// Validates that every schemas/**/*.json file is well-formed JSON Schema
// with a $id under this repo's GitHub Pages URL. No dependencies.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const repo = process.argv[2];
const base = `https://parksubeom.github.io/${repo}/schemas/`;
let failed = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".json")) check(p);
  }
}

function check(p) {
  let s;
  try {
    s = JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`✗ ${p}: invalid JSON (${e.message})`);
    failed++;
    return;
  }
  // POSIX separators so the $id comparison works on Windows too.
  const rel = relative("schemas", p).split(sep).join("/");
  const problems = [];
  if (s.$schema !== "https://json-schema.org/draft/2020-12/schema") problems.push("$schema must be draft 2020-12");
  if (s.$id !== base + rel) problems.push(`$id must be ${base + rel}`);
  if (!s.title) problems.push("title is required");
  if (problems.length) {
    console.error(`✗ ${p}: ${problems.join("; ")}`);
    failed++;
  } else console.log(`✓ ${p}`);
}

walk("schemas");
if (failed) process.exit(1);
