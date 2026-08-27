#!/usr/bin/env node

import { basename, join, resolve, sep } from "node:path";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = parseRoot();
const failures = [];

function parseRoot() {
  const index = process.argv.indexOf("--root");
  if (index === -1) return resolve(import.meta.dirname, "..");
  if (!process.argv[index + 1]) throw new Error("--root requires a path");
  return resolve(process.argv[index + 1]);
}

function fail(message) {
  failures.push(message);
}

function repositoryFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" }
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git ls-files failed");
  return result.stdout
    .split("\0")
    .filter(Boolean);
}

function isBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

const requiredRootFiles = [
  ".gitignore",
  ".repo-guard.json",
  ".github/workflows/ci.yml",
  ".github/workflows/codex-review-request.yml",
  ".github/workflows/codex-review-rerun.yml",
  ".github/workflows/codex-review.yml",
  ".github/workflows/osv-scan.yml",
  ".github/workflows/repository-guard.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs/repository-guardrails.md",
  "docs/stage-hosting.md",
  "docs/template-adoption.md",
  "scripts/check-repository.mjs",
  "scripts/codex-review-gate.mjs",
  "scripts/codex-review-helpers.mjs",
  "scripts/codex-review-request.mjs",
  "scripts/codex-review-rerun.mjs",
  "scripts/publish-codex-review-check.mjs",
  "template/README.md",
  "tests/codex-review-gate.test.mjs",
  "tests/ks-production-server-deploy.test.mjs",
  "tests/repository-guard.test.mjs",
  "third-party-notices.md"
];

for (const path of requiredRootFiles) {
  if (!existsSync(join(root, path))) fail(`Missing required repository file: ${path}`);
}

let config = { infrastructureDirectories: [], projects: [] };
try {
  config = JSON.parse(readFileSync(join(root, ".repo-guard.json"), "utf8"));
} catch (error) {
  fail(`Invalid .repo-guard.json: ${error.message}`);
}

const projects = Array.isArray(config.projects) ? config.projects : [];
const infrastructure = Array.isArray(config.infrastructureDirectories)
  ? config.infrastructureDirectories
  : [];
if (projects.length === 0) fail(".repo-guard.json must list at least one project");

const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const seen = new Set();
const rootReadme = existsSync(join(root, "README.md"))
  ? readFileSync(join(root, "README.md"), "utf8")
  : "";

for (const project of projects) {
  if (typeof project !== "string" || !kebabCase.test(project)) {
    fail(`Invalid project directory name: ${JSON.stringify(project)}`);
    continue;
  }
  if (seen.has(project)) fail(`Duplicate project in .repo-guard.json: ${project}`);
  seen.add(project);
  for (const required of ["README.md", "AGENTS.md"]) {
    if (!existsSync(join(root, project, required))) fail(`Project ${project} is missing ${required}`);
  }
  if (!rootReadme.includes(`](./${project}/)`)) fail(`Root README.md must link to ./${project}/`);
}

for (const directory of infrastructure) {
  if (typeof directory !== "string" || !kebabCase.test(directory)) {
    fail(`Invalid infrastructure directory: ${JSON.stringify(directory)}`);
  }
}

const files = repositoryFiles();
const allowedTopLevel = new Set([...projects, ...infrastructure]);
const actualTopLevel = new Set(
  files
    .map((file) => file.split("/").filter(Boolean))
    .filter((parts) => parts.length > 1 && !parts[0].startsWith("."))
    .map((parts) => parts[0])
);
for (const directory of actualTopLevel) {
  if (!allowedTopLevel.has(directory)) fail(`Unclassified top-level directory: ${directory}`);
}

const forbiddenSegments = new Set([
  ".next",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules"
]);
const forbiddenNames = [
  /^\.DS_Store$/,
  /^\.env(?:\..+)?$/,
  /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
  /\.(?:key|p12|pfx|pem|session)$/i
];
const secretPatterns = [
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["OpenAI-style API key", /sk-[A-Za-z0-9_-]{32,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Telegram bot token", /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/]
];
const personalPaths = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/
];

for (const file of files) {
  const normalized = file.split(sep).join("/");
  const parts = normalized.split("/");
  const name = basename(normalized);
  if (parts.some((part) => forbiddenSegments.has(part))) {
    fail(`Generated or dependency directory is tracked: ${normalized}`);
  }
  if (forbiddenNames.some((pattern) => pattern.test(name)) && name !== ".env.example") {
    fail(`Sensitive or local-only file is tracked: ${normalized}`);
  }

  const absolute = join(root, file);
  if (!existsSync(absolute)) {
    fail(`Tracked path is missing from the worktree: ${normalized}`);
    continue;
  }
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink()) {
    fail(`Symbolic links are not allowed: ${normalized}`);
    continue;
  }
  if (!stat.isFile() || stat.size > 2_000_000) continue;
  const buffer = readFileSync(absolute);
  if (isBinary(buffer)) continue;
  const text = buffer.toString("utf8");
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) fail(`Possible ${label} in ${normalized}`);
  }
  if (personalPaths.some((pattern) => pattern.test(text))) {
    fail(`Personal absolute path in ${normalized}`);
  }
}

for (const workflow of files.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file))) {
  const text = readFileSync(join(root, workflow), "utf8");
  if (/\bpull_request_target\b/.test(text)) fail(`High-risk pull_request_target trigger in ${workflow}`);
  if (!/^permissions:\s*(?:\n|$)/m.test(text)) {
    fail(`Workflow must declare top-level permissions: ${workflow}`);
  }
  if (/^permissions:\s*["']?write-all["']?\s*$/m.test(text)) {
    fail(`Workflow may not use write-all permissions: ${workflow}`);
  }
  for (const match of text.matchAll(/^\s*-?\s*uses:\s*["']?([^\s"']+)["']?\s*(?:#.*)?$/gm)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    const ref = action.slice(action.lastIndexOf("@") + 1);
    if (!/^[a-f0-9]{40}$/.test(ref)) {
      fail(`GitHub Action is not pinned to a full commit SHA in ${workflow}: ${action}`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Repository guard passed (${projects.length} projects, ${files.length} paths).`);
