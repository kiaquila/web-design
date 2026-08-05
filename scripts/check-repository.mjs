#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message) {
  failures.push(message);
}

function parseRoot() {
  const index = process.argv.indexOf("--root");
  if (index === -1) return resolve(import.meta.dirname, "..");
  if (!process.argv[index + 1]) throw new Error("--root requires a path");
  return resolve(process.argv[index + 1]);
}

function repositoryFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git ls-files failed");
  }

  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter((file) => !file.startsWith(".guard-trusted/"));
}

function looksBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return sample.includes(0);
}

const root = parseRoot();
const failures = [];
const requiredRootFiles = [
  ".gitignore",
  ".repo-guard.json",
  ".github/workflows/repository-guard.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs/repository-guardrails.md",
  "scripts/check-repository.mjs",
  "tests/repository-guard.test.mjs",
  "third-party-notices.md"
];

for (const path of requiredRootFiles) {
  if (!existsSync(join(root, path))) fail(`Missing required repository file: ${path}`);
}

let config;
try {
  config = JSON.parse(readFileSync(join(root, ".repo-guard.json"), "utf8"));
} catch (error) {
  fail(`Invalid .repo-guard.json: ${error.message}`);
  config = { projects: [] };
}

if (!Array.isArray(config.projects) || config.projects.length === 0) {
  fail(".repo-guard.json must list at least one project");
} else {
  const seen = new Set();
  const rootReadme = existsSync(join(root, "README.md"))
    ? readFileSync(join(root, "README.md"), "utf8")
    : "";

  for (const project of config.projects) {
    if (typeof project !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project)) {
      fail(`Invalid project directory name in .repo-guard.json: ${JSON.stringify(project)}`);
      continue;
    }
    if (seen.has(project)) fail(`Duplicate project in .repo-guard.json: ${project}`);
    seen.add(project);

    const projectRoot = join(root, project);
    if (!existsSync(projectRoot) || !lstatSync(projectRoot).isDirectory()) {
      fail(`Configured project directory does not exist: ${project}`);
      continue;
    }
    for (const required of ["README.md", "AGENTS.md"]) {
      if (!existsSync(join(projectRoot, required))) {
        fail(`Project ${project} is missing ${required}`);
      }
    }
    if (!rootReadme.includes(`](./${project}/)`)) {
      fail(`Root README.md must link to ./${project}/`);
    }
  }
}

const files = repositoryFiles(root);
const infrastructureDirectories = Array.isArray(config.infrastructureDirectories)
  ? config.infrastructureDirectories
  : [];
const configuredTopLevelDirectories = new Set([
  ...(Array.isArray(config.projects) ? config.projects : []),
  ...infrastructureDirectories
]);
const actualTopLevelDirectories = new Set(
  files
    .map((file) => file.split("/"))
    .filter((parts) => parts.length > 1 && !parts[0].startsWith("."))
    .map((parts) => parts[0])
);

for (const directory of infrastructureDirectories) {
  if (typeof directory !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(directory)) {
    fail(`Invalid infrastructure directory in .repo-guard.json: ${JSON.stringify(directory)}`);
  }
}
for (const directory of actualTopLevelDirectories) {
  if (!configuredTopLevelDirectories.has(directory)) {
    fail(
      `Unclassified top-level directory: ${directory}. ` +
        "List it as a project or an infrastructure directory in .repo-guard.json."
    );
  }
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
const personalPathPatterns = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/
];

for (const file of files) {
  const normalized = file.split(sep).join("/");
  const parts = normalized.split("/");
  const fileName = basename(normalized);

  if (parts.some((part) => forbiddenSegments.has(part))) {
    fail(`Generated or dependency directory is tracked: ${normalized}`);
  }
  if (
    forbiddenNames.some((pattern) => pattern.test(fileName)) &&
    !/^\.env\.example$/.test(fileName)
  ) {
    fail(`Sensitive or local-only file is tracked: ${normalized}`);
  }

  const absolute = join(root, file);
  let stat;
  try {
    stat = lstatSync(absolute);
  } catch {
    fail(`Tracked path is missing from the worktree: ${normalized}`);
    continue;
  }
  if (stat.isSymbolicLink()) {
    fail(`Symbolic links are not allowed: ${normalized}`);
    continue;
  }
  if (!stat.isFile() || stat.size > 2_000_000) continue;

  const buffer = readFileSync(absolute);
  if (looksBinary(buffer)) continue;
  const text = buffer.toString("utf8");

  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) fail(`Possible ${label} in ${normalized}`);
  }
  if (personalPathPatterns.some((pattern) => pattern.test(text))) {
    fail(`Personal absolute path in ${normalized}`);
  }
}

const workflows = files.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file));
for (const workflow of workflows) {
  const text = readFileSync(join(root, workflow), "utf8");
  if (/\bpull_request_target\b/.test(text)) {
    fail(`High-risk pull_request_target trigger in ${workflow}`);
  }
  if (!/^permissions:\s*(?:\n|$)/m.test(text)) {
    fail(`Workflow must declare top-level permissions: ${workflow}`);
  }
  if (/^permissions:\s*["']?write-all["']?\s*$/m.test(text)) {
    fail(`Workflow may not use write-all permissions: ${workflow}`);
  }

  for (const match of text.matchAll(/^\s*-?\s*uses:\s*["']?([^\s"']+)["']?\s*(?:#.*)?$/gm)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    const separator = action.lastIndexOf("@");
    const ref = separator === -1 ? "" : action.slice(separator + 1);
    if (!/^[a-f0-9]{40}$/.test(ref)) {
      fail(`GitHub Action is not pinned to a full commit SHA in ${workflow}: ${action}`);
    }
  }
}

if (failures.length) {
  console.error("Repository guard failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `Repository guard passed for ${files.length} repository files, ` +
    `${config.projects.length} project(s), and ${workflows.length} workflow(s).`
);
