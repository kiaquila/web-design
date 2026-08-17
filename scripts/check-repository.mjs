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
  ".github/workflows/codex-review.yml",
  ".github/workflows/codex-review-request.yml",
  ".github/workflows/codex-review-rerun.yml",
  ".github/workflows/cloudflare-stage-deployments.yml",
  ".github/workflows/ks-production-deploy.yml",
  ".github/workflows/repository-guard.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs/repository-guardrails.md",
  "docs/stage-hosting.md",
  "scripts/codex-review-gate.mjs",
  "scripts/codex-review-helpers.mjs",
  "scripts/codex-review-request.mjs",
  "scripts/codex-review-rerun.mjs",
  "scripts/register-cloudflare-stage-deployments.mjs",
  "scripts/wait-for-production-checks.mjs",
  "scripts/check-repository.mjs",
  "tests/cloudflare-stage-deployments.test.mjs",
  "tests/codex-review-gate.test.mjs",
  "tests/ks-production-deploy.test.mjs",
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

const workerProjectGroups = [
  ["stageProjects", config.stageProjects ?? {}, true],
  ["previewProjects", config.previewProjects ?? {}, false]
];
const configuredWorkerProjects = new Set();

for (const [groupName, workerProjects, workersDev] of workerProjectGroups) {
  if (
    typeof workerProjects !== "object" ||
    workerProjects === null ||
    Array.isArray(workerProjects)
  ) {
    fail(`.repo-guard.json ${groupName} must be an object`);
    continue;
  }

  for (const [project, stage] of Object.entries(workerProjects)) {
    if (configuredWorkerProjects.has(project)) {
      fail(`Worker project must not be both permanent and preview-only: ${project}`);
      continue;
    }
    configuredWorkerProjects.add(project);
    if (!config.projects?.includes(project)) {
      fail(`${groupName} project is not listed in projects: ${project}`);
      continue;
    }
    if (typeof stage !== "object" || stage === null || Array.isArray(stage)) {
      fail(`Stage configuration must be an object: ${project}`);
      continue;
    }

    const expectedRootPrefix = `${project}/`;
    const expectedWatchPath = `${project}/*`;
    const expectedWorkerName = project;

    if (
      typeof stage.rootDirectory !== "string" ||
      !stage.rootDirectory.startsWith(expectedRootPrefix) ||
      stage.rootDirectory.includes("..")
    ) {
      fail(
        `Stage rootDirectory for ${project} must stay inside ${project}/, ` +
          `received ${JSON.stringify(stage.rootDirectory)}`
      );
      continue;
    }
    if (stage.watchPath !== expectedWatchPath) {
      fail(
        `Stage watchPath for ${project} must be ${expectedWatchPath}, ` +
          `received ${JSON.stringify(stage.watchPath)}`
      );
    }

    const stageRoot = join(root, stage.rootDirectory);
    const wranglerPath = join(stageRoot, "wrangler.json");
    const packagePath = join(stageRoot, "package.json");
    if (!existsSync(wranglerPath)) {
      fail(`Stage project ${project} is missing website/wrangler.json`);
      continue;
    }
    if (!existsSync(packagePath)) {
      fail(`Stage project ${project} is missing website/package.json`);
      continue;
    }

    let wrangler;
    let packageJson;
    try {
      wrangler = JSON.parse(readFileSync(wranglerPath, "utf8"));
    } catch (error) {
      fail(`Invalid stage Wrangler config for ${project}: ${error.message}`);
      continue;
    }
    try {
      packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    } catch (error) {
      fail(`Invalid stage package.json for ${project}: ${error.message}`);
      continue;
    }

    if (wrangler.name !== expectedWorkerName) {
      fail(
        `Stage Worker for ${project} must be named ${expectedWorkerName}, ` +
          `received ${JSON.stringify(wrangler.name)}`
      );
    }
    if (typeof wrangler.main !== "string" || !wrangler.main.trim()) {
      fail(`Stage Worker for ${project} must define a main entry point`);
    } else {
      const entryPoint = resolve(stageRoot, wrangler.main);
      if (!entryPoint.startsWith(`${resolve(stageRoot)}${sep}`) || !existsSync(entryPoint)) {
        fail(`Stage Worker entry point does not exist inside ${project}: ${wrangler.main}`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wrangler.compatibility_date ?? "")) {
      fail(`Stage Worker for ${project} must pin a compatibility_date`);
    }
    if (wrangler.workers_dev !== workersDev) {
      const expectation = workersDev ? "enable" : "disable";
      fail(`${groupName} Worker for ${project} must ${expectation} workers_dev`);
    }
    if (wrangler.preview_urls !== true) {
      fail(`Stage Worker for ${project} must enable preview_urls`);
    }

    const scripts = packageJson.scripts ?? {};
    if (typeof scripts.build !== "string" || !scripts.build.trim()) {
      fail(`Stage project ${project} must define an npm build script`);
    }
    if (!/(?:^|\s)wrangler deploy(?:\s|$)/.test(scripts["stage:deploy"] ?? "")) {
      fail(`Stage project ${project} must deploy with wrangler deploy`);
    }
    if (!/(?:^|\s)wrangler versions upload(?:\s|$)/.test(scripts["stage:preview"] ?? "")) {
      fail(`Stage project ${project} must preview with wrangler versions upload`);
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

const codexReviewWorkflow = ".github/workflows/codex-review.yml";
if (files.includes(codexReviewWorkflow)) {
  const text = readFileSync(join(root, codexReviewWorkflow), "utf8");
  const executableYaml = text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const requiredFragments = [
    "name: Codex Review",
    "pull_request:",
    "name: Checkout trusted Codex review gate",
    "ref: ${{ github.event.repository.default_branch }}",
    "path: .codex-review-trusted",
    'node "$script_root/scripts/codex-review-gate.mjs"'
  ];
  for (const fragment of requiredFragments) {
    if (!executableYaml.includes(fragment)) {
      fail(`Codex Review workflow is missing trusted gate invariant: ${fragment}`);
    }
  }
}

const codexReviewRequestWorkflow = ".github/workflows/codex-review-request.yml";
if (files.includes(codexReviewRequestWorkflow)) {
  const executableYaml = readFileSync(join(root, codexReviewRequestWorkflow), "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const topLevelPermissions = executableYaml.match(
    /^permissions:\s*\n((?: {2}[^\n]*(?:\n|$))*)/m
  )?.[1] || "";
  if (!/^ {2}pull-requests:\s*write\s*$/m.test(topLevelPermissions)) {
    fail("Codex Review Request workflow must grant pull-requests: write for trusted request markers.");
  }
  const requestJobMatch = /^ {2}codex-review-request:\s*$/m.exec(executableYaml);
  const requestJobTail = requestJobMatch
    ? executableYaml.slice(requestJobMatch.index + requestJobMatch[0].length)
    : "";
  const nextJobOffset = requestJobTail.search(/^ {2}[A-Za-z0-9_-]+:\s*$/m);
  const requestJob = nextJobOffset === -1
    ? requestJobTail
    : requestJobTail.slice(0, nextJobOffset);
  if (!requestJobMatch || /^ {4}(?:permissions|["']permissions["'])[ \t]*:/m.test(requestJob)) {
    fail("Codex Review Request job must not override its trusted workflow permissions.");
  }
}

const ksProductionWorkflow = ".github/workflows/ks-production-deploy.yml";
if (files.includes(ksProductionWorkflow)) {
  const executableYaml = readFileSync(join(root, ksProductionWorkflow), "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const requiredFragments = [
    "name: KS Production Deploy",
    "  push:",
    "      - main",
    '      - "ks/**"',
    "group: ks-production-deploy",
    "cancel-in-progress: false",
    "needs: required-checks",
    "if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
    "name: production",
    "runs-on: ubuntu-latest",
    "id-token: write",
    "tailscale/github-action@306e68a486fd2350f2bfc3b19fcd143891a4a2d8",
    "KS_DESIGN_EXPECTED_REVISION: ${{ github.sha }}",
    "KS_DESIGN_DEPLOY_RUN_ID: ${{ github.run_id }}",
    "KS_DESIGN_DEPLOY_TARGET: ks-production",
    "KS_DESIGN_SSH_PRIVATE_KEY: ${{ secrets.KS_DESIGN_SSH_PRIVATE_KEY }}",
    "ks/website/production/deploy.sh",
    "purge_cache",
    "sha256sum ks/website/src/js/site.js"
  ];
  for (const fragment of requiredFragments) {
    if (!executableYaml.includes(fragment)) {
      fail(`KS production workflow is missing deployment invariant: ${fragment}`);
    }
  }
  if (/^\s*pull_request\s*:/m.test(executableYaml)) {
    fail("KS production workflow must never run for pull_request events");
  }
  if (/^\s*workflow_dispatch\s*:/m.test(executableYaml)) {
    fail("KS production workflow must not expose a manual production trigger");
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
