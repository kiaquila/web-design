#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_ROOT_FILES = [
  ".gitignore",
  ".github/CODEOWNERS",
  ".web-design/project.json",
  ".web-design/lock.json",
  ".web-design/managed-files.json",
  ".web-design/release-manifest.json",
  ".github/pull_request_template.md",
  ".github/workflows/baseline-source-verification.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/repository-guard.yml",
  ".github/workflows/osv-scan.yml",
  ".github/workflows/web-design-update.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs/standards/content-and-design.md",
  "docs/standards/deployment.md",
  "docs/standards/git-and-reviews.md",
  "docs/standards/project-structure.md",
  "docs/standards/security.md",
  "docs/standards/testing.md",
  "docs/operations/bootstrap.md",
  "docs/operations/github-setup.md",
  "docs/operations/updates.md",
  "package.json",
  "scripts/check-managed-files.mjs",
  "scripts/check-baseline-change.mjs",
  "scripts/check-repository.mjs",
  "scripts/build-release-manifest.mjs",
  "scripts/run-project-checks.mjs",
  "scripts/sync-project.mjs",
  "scripts/test-web-design.mjs"
];

const FORBIDDEN_SEGMENTS = new Set([
  ".next",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules"
]);
const FORBIDDEN_NAMES = [
  /^\.DS_Store$/,
  /^\.env(?:\..+)?$/,
  /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
  /\.(?:key|p12|pfx|pem|session)$/i
];
const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["OpenAI-style API key", /sk-[A-Za-z0-9_-]{32,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Telegram bot token", /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/]
];
const PERSONAL_PATH_PATTERNS = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/
];

const KNOWN_NO_OP_COMMAND = /^(?:(?:true|:|exit\s+0|echo(?:\s+.*)?|printf(?:\s+.*)?)(?:\s*(?:&&|;)\s*)?)+$/;

function parseRoot(argv = process.argv.slice(2)) {
  const index = argv.indexOf("--root");
  if (index === -1) return resolve(import.meta.dirname, "..");
  if (!argv[index + 1]) throw new Error("--root requires a path");
  return resolve(argv[index + 1]);
}

function repositoryFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" }
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git ls-files failed");
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter((file) => !file.startsWith(".guard-trusted/"));
}

function looksBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

export function validateProjectConfig(config, profiles = []) {
  const failures = [];
  const availableProfiles = Array.isArray(profiles) ? profiles : Object.keys(profiles);
  if (config?.schemaVersion !== 1) failures.push("project.json schemaVersion must be 1");
  const slug = config?.project?.slug;
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    failures.push("project.slug must be lower-case kebab-case");
  }
  const profile = config?.project?.profile;
  if (typeof profile !== "string" || !availableProfiles.includes(profile)) {
    failures.push(`project.profile must name an installed profile: ${JSON.stringify(profile)}`);
  }
  const productPaths = config?.project?.productPaths;
  if (!Array.isArray(productPaths)) {
    failures.push("project.productPaths must be an array");
  } else {
    for (const path of productPaths) {
      const normalized = typeof path === "string" ? normalize(path) : "";
      if (!normalized || isAbsolute(normalized) || normalized === ".." || normalized.startsWith(`..${sep}`)) {
        failures.push(`Unsafe product path: ${JSON.stringify(path)}`);
      }
    }
  }
  if (!Array.isArray(config?.commands?.check)) {
    failures.push("commands.check must be an array");
  } else if (config?.governance?.mode === "consumer" && config.commands.check.length === 0) {
    failures.push("consumer projects must configure at least one product check");
  } else {
    for (const [index, check] of config.commands.check.entries()) {
      if (!check || typeof check !== "object" || Array.isArray(check)) {
        failures.push(`commands.check[${index}] must be an object`);
        continue;
      }
      if (typeof check.name !== "string" || !check.name.trim()) {
        failures.push(`commands.check[${index}].name must be a non-empty string`);
      }
      if (typeof check.run !== "string" || !check.run.trim()) {
        failures.push(`commands.check[${index}].run must be a non-empty string`);
        continue;
      }
      const normalized = check.run.trim().replace(/\s+/g, " ");
      if (KNOWN_NO_OP_COMMAND.test(normalized)) {
        failures.push(`commands.check[${index}].run must execute a real product check`);
      }
    }
  }
  const rootDirectory = config?.deployment?.rootDirectory;
  const normalizedRoot = typeof rootDirectory === "string" ? normalize(rootDirectory) : "";
  if (
    !normalizedRoot ||
    isAbsolute(normalizedRoot) ||
    normalizedRoot === ".." ||
    normalizedRoot.startsWith(`..${sep}`)
  ) {
    failures.push("deployment.rootDirectory must stay inside the repository");
  }
  if (config?.deployment?.productionBranch !== "main") {
    failures.push("deployment.productionBranch must be main");
  }
  const profileData = Array.isArray(profiles) ? null : profiles[profile];
  if (profileData && config?.deployment?.provider !== profileData.deploymentProvider) {
    failures.push(`deployment.provider must match profile ${profile}`);
  }
  if (config?.governance?.source !== "kiaquila/web-design") {
    failures.push("governance.source must be kiaquila/web-design");
  }
  if (!new Set(["source", "consumer"]).has(config?.governance?.mode)) {
    failures.push("governance.mode must be source or consumer");
  }
  return failures;
}

function stripYamlComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote === '"' && char === "\\") {
      index += 1;
      continue;
    }
    if (quote && char === quote) {
      if (quote === "'" && value[index + 1] === "'") {
        index += 1;
        continue;
      }
      quote = null;
      continue;
    }
    if (!quote && (char === '"' || char === "'")) {
      quote = char;
      continue;
    }
    if (!quote && char === "#" && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value;
}

function yamlScalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function unsupportedYamlConstruct(value) {
  const trimmed = stripYamlComment(value).trim();
  if (/^[|>](?:[1-9]?[+-]?|[+-]?[1-9]?)?$/.test(trimmed)) return "block scalar";
  if (trimmed === "<<" || /^[&*!?]/.test(trimmed)) {
    return "anchor, alias, tag, or complex key";
  }
  return null;
}

function flowDepth(value) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote === '"' && char === "\\") {
      index += 1;
      continue;
    }
    if (quote && char === quote) {
      if (quote === "'" && value[index + 1] === "'") {
        index += 1;
        continue;
      }
      quote = null;
    } else if (!quote && (char === '"' || char === "'")) {
      quote = char;
    } else if (!quote && (char === "[" || char === "{")) {
      depth += 1;
    } else if (!quote && (char === "]" || char === "}")) {
      depth -= 1;
    }
  }
  return depth;
}

function splitFlowItems(value) {
  const items = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote === '"' && char === "\\") {
      index += 1;
      continue;
    }
    if (quote && char === quote) {
      if (quote === "'" && value[index + 1] === "'") {
        index += 1;
        continue;
      }
      quote = null;
    } else if (!quote && (char === '"' || char === "'")) {
      quote = char;
    } else if (!quote && (char === "[" || char === "{")) {
      depth += 1;
    } else if (!quote && (char === "]" || char === "}")) {
      depth -= 1;
    } else if (!quote && depth === 0 && char === ",") {
      items.push(value.slice(start, index));
      start = index + 1;
    }
  }
  items.push(value.slice(start));
  return items;
}

function topLevelColon(value) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote === '"' && char === "\\") {
      index += 1;
      continue;
    }
    if (quote && char === quote) {
      if (quote === "'" && value[index + 1] === "'") {
        index += 1;
        continue;
      }
      quote = null;
    } else if (!quote && (char === '"' || char === "'")) {
      quote = char;
    } else if (!quote && (char === "[" || char === "{")) {
      depth += 1;
    } else if (!quote && (char === "]" || char === "}")) {
      depth -= 1;
    } else if (!quote && depth === 0 && char === ":") {
      return index;
    }
  }
  return -1;
}

function flowHasPullRequest(value) {
  const open = value[0];
  const close = open === "[" ? "]" : "}";
  if (!new Set(["[", "{"]).has(open) || !value.endsWith(close)) return false;
  const items = splitFlowItems(value.slice(1, -1));
  if (open === "[") {
    return items.some((item) => {
      const scalar = yamlScalar(item);
      return scalar === "pull_request" || /^[&*!]/.test(scalar);
    });
  }
  return items.some((item) => {
    const colon = topLevelColon(item);
    if (colon === -1) return /^[&*!]/.test(item.trim());
    const key = yamlScalar(item.slice(0, colon));
    return key === "pull_request" || key === "<<" || /^[&*!]/.test(key);
  });
}

function hasPullRequestTrigger(text) {
  const lines = text.split("\n");
  const onIndex = lines.findIndex((line) => /^(?:on|["']on["'])\s*:(?:\s|$)/.test(line));
  if (onIndex === -1) return false;
  const separator = lines[onIndex].indexOf(":");
  let value = stripYamlComment(lines[onIndex].slice(separator + 1)).trim();
  if (value) {
    let index = onIndex + 1;
    while ((value.startsWith("[") || value.startsWith("{")) && flowDepth(value) > 0 && index < lines.length) {
      value += ` ${stripYamlComment(lines[index]).trim()}`;
      index += 1;
    }
    if (value.startsWith("[") || value.startsWith("{")) return flowHasPullRequest(value);
    const scalar = yamlScalar(value);
    return scalar === "pull_request" || /^[&*!]/.test(scalar);
  }
  let eventIndent = null;
  for (let index = onIndex + 1; index < lines.length; index += 1) {
    const line = stripYamlComment(lines[index]);
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)[0].length;
    if (indent === 0) break;
    if (eventIndent === null) eventIndent = indent;
    if (indent !== eventIndent) continue;
    const event = line.trim().replace(/^-\s*/, "");
    const colon = event.indexOf(":");
    const scalar = colon === -1 ? event : event.slice(0, colon);
    const eventName = yamlScalar(scalar);
    if (eventName === "pull_request" || eventName === "<<" || /^[&*!]/.test(eventName)) return true;
  }
  return false;
}

function unsupportedTriggerConstructs(text) {
  const lines = text.split("\n");
  const onIndex = lines.findIndex((line) => /^(?:on|["']on["'])\s*:(?:\s|$)/.test(line));
  if (onIndex === -1) return [];
  const separator = lines[onIndex].indexOf(":");
  let value = stripYamlComment(lines[onIndex].slice(separator + 1)).trim();
  if (value) {
    let index = onIndex + 1;
    while ((value.startsWith("[") || value.startsWith("{")) && flowDepth(value) > 0 && index < lines.length) {
      value += ` ${stripYamlComment(lines[index]).trim()}`;
      index += 1;
    }
    if (!value.startsWith("[") && !value.startsWith("{")) {
      const kind = unsupportedYamlConstruct(value);
      return kind ? [kind] : [];
    }
    if (flowDepth(value) !== 0 || !value.endsWith(value.startsWith("[") ? "]" : "}")) {
      return ["malformed flow collection"];
    }
    const items = splitFlowItems(value.slice(1, -1));
    const kinds = new Set();
    for (const item of items) {
      const colon = value.startsWith("{") ? topLevelColon(item) : -1;
      const parts = colon === -1 ? [item] : [item.slice(0, colon), item.slice(colon + 1)];
      for (const part of parts) {
        const kind = unsupportedYamlConstruct(part);
        if (kind) kinds.add(kind);
      }
    }
    return [...kinds];
  }
  let eventIndent = null;
  const kinds = new Set();
  for (let index = onIndex + 1; index < lines.length; index += 1) {
    const line = stripYamlComment(lines[index]);
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)[0].length;
    if (indent === 0) break;
    if (eventIndent === null) eventIndent = indent;
    if (indent !== eventIndent) continue;
    const event = line.trim().replace(/^-\s*/, "");
    const colon = topLevelColon(event);
    const parts = colon === -1 ? [event] : [event.slice(0, colon), event.slice(colon + 1)];
    for (const part of parts) {
      const kind = unsupportedYamlConstruct(part);
      if (kind) kinds.add(kind);
    }
  }
  return [...kinds];
}

function unsupportedPermissionConstructs(lines, start, indent) {
  const kinds = new Set();
  const first = stripYamlComment(lines[start].slice(indent)).trim();
  const separator = first.indexOf(":");
  let value = separator === -1 ? "" : first.slice(separator + 1).trim();
  if (value) {
    let index = start + 1;
    while (value.startsWith("{") && flowDepth(value) > 0 && index < lines.length) {
      value += ` ${stripYamlComment(lines[index]).trim()}`;
      index += 1;
    }
    if (value.startsWith("{")) {
      if (flowDepth(value) !== 0 || !value.endsWith("}")) kinds.add("malformed flow collection");
      else {
        for (const item of splitFlowItems(value.slice(1, -1))) {
          const colon = topLevelColon(item);
          const parts = colon === -1 ? [item] : [item.slice(0, colon), item.slice(colon + 1)];
          for (const part of parts) {
            const kind = unsupportedYamlConstruct(part);
            if (kind) kinds.add(kind);
          }
        }
      }
    } else {
      const kind = unsupportedYamlConstruct(value);
      if (kind) kinds.add(kind);
    }
    return [...kinds];
  }
  let entryIndent = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = stripYamlComment(lines[index]);
    if (!line.trim()) continue;
    const currentIndent = line.match(/^\s*/)[0].length;
    if (currentIndent <= indent) break;
    if (entryIndent === null) entryIndent = currentIndent;
    if (currentIndent !== entryIndent) continue;
    const entry = line.trim();
    const colon = topLevelColon(entry);
    const parts = colon === -1 ? [entry] : [entry.slice(0, colon), entry.slice(colon + 1)];
    for (const part of parts) {
      const kind = unsupportedYamlConstruct(part);
      if (kind) kinds.add(kind);
    }
  }
  return [...kinds];
}

function permissionBlockWrites(lines, start, indent) {
  const first = stripYamlComment(lines[start].slice(indent)).trim();
  const separator = first.indexOf(":");
  let value = separator === -1 ? "" : first.slice(separator + 1).trim();
  if (value.startsWith("{")) {
    let index = start + 1;
    while (flowDepth(value) > 0 && index < lines.length) {
      value += ` ${stripYamlComment(lines[index]).trim()}`;
      index += 1;
    }
    if (value.endsWith("}")) {
      return splitFlowItems(value.slice(1, -1)).some((item) => {
        const colon = topLevelColon(item);
        if (colon === -1) return /^[&*!]/.test(item.trim());
        const key = yamlScalar(item.slice(0, colon));
        const level = yamlScalar(item.slice(colon + 1));
        return key === "<<" || level === "write" || /^[&*!]/.test(level);
      });
    }
  }
  const scalar = yamlScalar(value);
  if (new Set(["write-all", "write"]).has(scalar) || /^[&*!]/.test(scalar)) return true;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = stripYamlComment(lines[index]);
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const currentIndent = line.match(/^\s*/)[0].length;
    if (currentIndent <= indent) break;
    const colon = line.indexOf(":");
    if (colon === -1) {
      if (/^[&*!]/.test(line.trim())) return true;
      continue;
    }
    const key = yamlScalar(line.slice(0, colon));
    const level = yamlScalar(line.slice(colon + 1));
    if (key === "<<" || level === "write" || /^[&*!]/.test(level)) return true;
  }
  return false;
}

function dispatchOnlyJob(jobLines) {
  const ifIndex = jobLines.findIndex((line) => /^\s{4}if\s*:/.test(line));
  if (ifIndex === -1) return false;
  const first = jobLines[ifIndex].replace(/^\s{4}if\s*:\s*/, "").trim();
  const parts = first && !new Set(["|", ">", "|-", ">-"]).has(first) ? [first] : [];
  for (let index = ifIndex + 1; index < jobLines.length; index += 1) {
    const line = jobLines[index];
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= 4) break;
    parts.push(line.trim());
  }
  const condition = parts.join(" ").replace(/^\$\{\{\s*/, "").replace(/\s*\}\}$/, "").trim();
  if (condition.includes("||") || condition.includes("?")) return false;
  return condition.split(/\s*&&\s*/).some((part) =>
    /^\(*\s*github\.event_name\s*==\s*["']workflow_dispatch["']\s*\)*$/.test(part)
  );
}

export function validateWorkflowText(path, text) {
  const failures = [];
  if (/\bpull_request_target\b/.test(text)) {
    failures.push(`High-risk pull_request_target trigger in ${path}`);
  }
  if (!/^permissions:\s*(?:\n|$)/m.test(text)) {
    failures.push(`Workflow must declare top-level permissions: ${path}`);
  }
  if (/^permissions:\s*["']?write-all["']?\s*$/m.test(text)) {
    failures.push(`Workflow may not use write-all permissions: ${path}`);
  }
  for (const kind of unsupportedTriggerConstructs(text)) {
    failures.push(`Workflow trigger uses unsupported YAML ${kind}: ${path}`);
  }
  const lines = text.split("\n");
  const permissionBlocks = lines
    .map((line, index) => ({ index, indent: line.match(/^\s*/)[0].length }))
    .filter(({ index, indent }) => (indent === 0 || indent === 4) && /^\s*permissions\s*:/.test(lines[index]));
  for (const { index, indent } of permissionBlocks) {
    const scope = indent === 0 ? "top-level permissions" : "job permissions";
    for (const kind of unsupportedPermissionConstructs(lines, index, indent)) {
      failures.push(`Workflow ${scope} use unsupported YAML ${kind}: ${path}`);
    }
  }
  if (hasPullRequestTrigger(text)) {
    const topPermissions = lines.findIndex((line) => /^permissions\s*:/.test(line));
    if (topPermissions !== -1 && permissionBlockWrites(lines, topPermissions, 0)) {
      failures.push(`Pull-request workflow may not grant top-level write permissions: ${path}`);
    }
    const jobsIndex = lines.findIndex((line) => /^jobs:\s*$/.test(line));
    if (jobsIndex !== -1) {
      for (let start = jobsIndex + 1; start < lines.length;) {
        if (!/^\s{2}[A-Za-z0-9_-]+:\s*$/.test(lines[start])) {
          start += 1;
          continue;
        }
        let end = start + 1;
        while (end < lines.length && !/^\s{2}[A-Za-z0-9_-]+:\s*$/.test(lines[end])) end += 1;
        const jobLines = lines.slice(start, end);
        const permissionsIndex = jobLines.findIndex((line) => /^\s{4}permissions\s*:/.test(line));
        if (
          permissionsIndex !== -1 &&
          permissionBlockWrites(jobLines, permissionsIndex, 4) &&
          !dispatchOnlyJob(jobLines)
        ) {
          const job = lines[start].trim().slice(0, -1);
          failures.push(`Pull-request job ${job} may not grant write permissions: ${path}`);
        }
        start = end;
      }
    }
  }
  for (const match of text.matchAll(/^\s*-?\s*uses:\s*["']?([^\s"']+)["']?\s*(?:#.*)?$/gm)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    const ref = action.slice(action.lastIndexOf("@") + 1);
    if (!/^[a-f0-9]{40}$/.test(ref)) {
      failures.push(`GitHub Action is not pinned to a full commit SHA in ${path}: ${action}`);
    }
  }
  return failures;
}

export function scanRepository(root) {
  const failures = [];
  for (const path of REQUIRED_ROOT_FILES) {
    if (!existsSync(join(root, path))) failures.push(`Missing required repository file: ${path}`);
  }

  const files = repositoryFiles(root);
  const profileFiles = files.filter((file) => /^\.web-design\/profiles\/[a-z0-9-]+\.json$/.test(file));
  const profiles = {};
  for (const file of profileFiles) {
    const id = basename(file, ".json");
    try {
      profiles[id] = JSON.parse(readFileSync(join(root, file), "utf8"));
    } catch (error) {
      failures.push(`Invalid profile ${file}: ${error.message}`);
    }
  }
  const availableProfiles = Object.keys(profiles);
  try {
    const config = JSON.parse(readFileSync(join(root, ".web-design/project.json"), "utf8"));
    failures.push(...validateProjectConfig(config, profiles));
    const profile = profiles[config?.project?.profile];
    const deploymentRoot = config?.deployment?.rootDirectory || ".";
    for (const required of profile?.requiredProjectFiles ?? []) {
      if (!existsSync(join(root, deploymentRoot, required))) {
        failures.push(`Profile ${profile.id} requires ${join(deploymentRoot, required)}`);
      }
    }
    const lock = JSON.parse(readFileSync(join(root, ".web-design/lock.json"), "utf8"));
    if (lock.profile !== config?.project?.profile) {
      failures.push("lock.profile must match project.profile");
    }
  } catch (error) {
    failures.push(`Invalid .web-design/project.json: ${error.message}`);
  }

  for (const file of files) {
    const normalized = file.split(sep).join("/");
    const parts = normalized.split("/");
    const fileName = basename(normalized);
    if (parts.some((part) => FORBIDDEN_SEGMENTS.has(part))) {
      failures.push(`Generated or dependency directory is tracked: ${normalized}`);
    }
    if (FORBIDDEN_NAMES.some((pattern) => pattern.test(fileName)) && fileName !== ".env.example") {
      failures.push(`Sensitive or local-only file is tracked: ${normalized}`);
    }
    const absolute = join(root, file);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      failures.push(`Repository path is missing from the worktree: ${normalized}`);
      continue;
    }
    if (stat.isSymbolicLink()) {
      failures.push(`Symbolic links are not allowed: ${normalized}`);
      continue;
    }
    if (!stat.isFile() || stat.size > 2_000_000) continue;
    const buffer = readFileSync(absolute);
    if (looksBinary(buffer)) continue;
    const text = buffer.toString("utf8");
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(text)) failures.push(`Possible ${label} in ${normalized}`);
    }
    if (PERSONAL_PATH_PATTERNS.some((pattern) => pattern.test(text))) {
      failures.push(`Personal absolute path in ${normalized}`);
    }
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(normalized)) {
      failures.push(...validateWorkflowText(normalized, text));
    }
  }
  return { failures, files, availableProfiles };
}

export function main(argv = process.argv.slice(2)) {
  const root = parseRoot(argv);
  const result = scanRepository(root);
  if (result.failures.length) {
    console.error("Repository guard failed:");
    for (const message of result.failures) console.error(`- ${message}`);
    return 1;
  }
  console.log(
    `Repository guard passed for ${result.files.length} files and ` +
      `${result.availableProfiles.length} profile(s).`
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
