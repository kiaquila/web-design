import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "..");
const guardScript = join(repositoryRoot, "scripts/check-repository.mjs");
const checkoutSha = "3d3c42e5aac5ba805825da76410c181273ba90b1";

function write(root, path, contents = "placeholder\n") {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "web-design-guard-"));
  for (const path of [
    ".gitignore",
    "AGENTS.md",
    "CLAUDE.md",
    "docs/repository-guardrails.md",
    "docs/stage-hosting.md",
    "docs/template-adoption.md",
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
  ]) write(root, path);
  write(root, ".repo-guard.json", JSON.stringify({
    infrastructureDirectories: ["docs", "scripts", "template", "tests"],
    projects: ["demo"]
  }));
  write(root, "README.md", "[Demo](./demo/)\n");
  write(root, "demo/AGENTS.md");
  write(root, "demo/README.md");
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(guardScript, join(root, "scripts/check-repository.mjs"));

  for (const name of [
    "ci",
    "codex-review",
    "codex-review-request",
    "codex-review-rerun",
    "osv-scan",
    "repository-guard"
  ]) {
    write(root, `.github/workflows/${name}.yml`, [
      `name: ${name}`,
      "on: push",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  check:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${checkoutSha}`,
      ""
    ].join("\n"));
  }
  git(root, "init", "-q");
  git(root, "add", "-A");
  return root;
}

function runGuard(root) {
  return spawnSync(process.execPath, [guardScript, "--root", root], { encoding: "utf8" });
}

function withFixture(run) {
  const root = makeFixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts a minimal conforming repository", () => {
  withFixture((root) => {
    const result = runGuard(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Repository guard passed/);
  });
});

test("requires project context files and a root index link", () => {
  withFixture((root) => {
    rmSync(join(root, "demo/AGENTS.md"));
    writeFileSync(join(root, "README.md"), "No project link\n");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /demo is missing AGENTS\.md/);
    assert.match(result.stderr, /must link to \.\/demo\//);
  });
});

test("rejects unclassified top-level directories", () => {
  withFixture((root) => {
    write(root, "mystery/file.txt");
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unclassified top-level directory: mystery/);
  });
});

test("rejects secrets, personal paths, and local environment files", () => {
  withFixture((root) => {
    write(root, "demo/token.txt", `ghp_${"A".repeat(32)}\n`);
    write(root, "demo/path.txt", ["", "Users", "example", "private", "file.txt"].join("/") + "\n");
    write(root, "demo/.env", "SECRET=placeholder\n");
    git(root, "add", "-f", "demo/.env", "demo/path.txt", "demo/token.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token/);
    assert.match(result.stderr, /Personal absolute path/);
    assert.match(result.stderr, /Sensitive or local-only file/);
  });
});

test("rejects generated output and dependency directories", () => {
  withFixture((root) => {
    write(root, "demo/dist/index.html");
    write(root, "demo/node_modules/package/index.js");
    git(root, "add", "-f", "demo/dist/index.html", "demo/node_modules/package/index.js");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /demo\/dist\/index\.html/);
    assert.match(result.stderr, /demo\/node_modules\/package\/index\.js/);
  });
});

test("requires safe workflow triggers, permissions, and pinned actions", () => {
  withFixture((root) => {
    const path = join(root, ".github/workflows/ci.yml");
    const workflow = readFileSync(path, "utf8")
      .replace("on: push", "on: pull_request_target")
      .replace("permissions:\n  contents: read\n", "")
      .replace(checkoutSha, "v4");
    writeFileSync(path, workflow);
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pull_request_target/);
    assert.match(result.stderr, /top-level permissions/);
    assert.match(result.stderr, /not pinned to a full commit SHA/);
  });
});

test("allows an environment example with placeholders", () => {
  withFixture((root) => {
    write(root, "demo/.env.example", "API_KEY=replace-me\n");
    git(root, "add", "-f", "demo/.env.example");
    const result = runGuard(root);
    assert.equal(result.status, 0, result.stderr);
  });
});
