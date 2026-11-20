#!/usr/bin/env node
// Enforces `scope: outcome` commit subjects and PR titles. See CONTRIBUTING.md.
//   node scripts/check-commit-msg.mjs <path-to-commit-msg-file>
//   node scripts/check-commit-msg.mjs --title "<pr title>"
import { readFileSync } from "node:fs";

const MAX_SUBJECT = 72;
const SUBJECT = /^[a-z][a-z0-9-]*(\/[a-z0-9-]+)?: \S/;
const GENERATED = /^(Merge |Revert "|fixup! |squash! |amend! )/;

const [flag, value] = process.argv.slice(2);
if (!flag) {
  console.error("usage: check-commit-msg.mjs <msg-file> | --title <text>");
  process.exit(2);
}
const raw = flag === "--title" ? (value ?? "") : readFileSync(flag, "utf8");
const subject =
  raw
    .split("\n")
    .find((line) => line.trim() !== "" && !line.startsWith("#"))
    ?.trim() ?? "";

const problems = [];
if (!GENERATED.test(subject)) {
  if (!SUBJECT.test(subject))
    problems.push("must look like `scope: outcome` (lowercase scope)");
  if (subject.length > MAX_SUBJECT)
    problems.push(`is ${subject.length} chars; keep it ≤ ${MAX_SUBJECT}`);
  if (subject.endsWith(".")) problems.push("must not end with a period");
}

if (problems.length > 0) {
  console.error(`✖ "${subject}"`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "  e.g. `map: add 3D camera toggle` · scopes listed in CONTRIBUTING.md",
  );
  process.exit(1);
}
