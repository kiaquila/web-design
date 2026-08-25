import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const templateRoot = resolve(import.meta.dirname, "..");

function write(root, path, contents) {
  const target = join(root, path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, contents);
}

function run(root, script) {
  return spawnSync(process.execPath, [join(root, "scripts", script), "--root", root], {
    cwd: root,
    encoding: "utf8"
  });
}

function configure(root) {
  const configPath = join(root, "web-design.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.projectSlug = "demo-project";
  config.projectChecks = [{
    name: "real project smoke",
    command: ["node", "-e", "process.exit(0)"]
  }];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const owners = readFileSync(join(root, ".github/CODEOWNERS"), "utf8")
    .replaceAll("replace-with-owner", "owner");
  writeFileSync(join(root, ".github/CODEOWNERS"), owners);
}

function makeFixture({ configured = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "web-design-template-"));
  cpSync(templateRoot, root, { recursive: true });
  if (configured) configure(root);
  const git = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
  assert.equal(git.status, 0, git.stderr);
  const add = spawnSync("git", ["add", "-A"], { cwd: root, encoding: "utf8" });
  assert.equal(add.status, 0, add.stderr);
  write(root, "dist/index.html", "<!doctype html><title>Demo</title>\n");
  write(root, "dist/app.js", "document.documentElement.dataset.ready = 'true';\n");
  return root;
}

function withFixture(options, callback) {
  const root = makeFixture(options);
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("the untouched reference requires deliberate project configuration", () => {
  withFixture({ configured: false }, (root) => {
    const result = run(root, "check-repository.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /projectSlug must be replaced/);
    assert.match(result.stderr, /projectChecks must contain at least one real/);
    assert.match(result.stderr, /CODEOWNERS placeholder/);
  });
});

test("configured repository, project commands, and payload pass", () => {
  withFixture({}, (root) => {
    for (const script of [
      "check-repository.mjs",
      "run-project-checks.mjs",
      "check-performance-budget.mjs"
    ]) {
      const result = run(root, script);
      assert.equal(result.status, 0, `${script}\n${result.stderr}`);
    }
  });
});

test("project commands are executed directly and failures propagate", () => {
  withFixture({}, (root) => {
    const path = join(root, "web-design.config.json");
    const config = JSON.parse(readFileSync(path, "utf8"));
    config.projectChecks = [{ name: "failing test", command: ["node", "-e", "process.exit(7)"] }];
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
    const result = run(root, "run-project-checks.mjs");
    assert.equal(result.status, 7);
  });
});

test("JavaScript gzip budget retains the Alex Neon 20 KiB ceiling", () => {
  withFixture({}, (root) => {
    write(root, "dist/app.js", randomBytes(25 * 1024));
    const result = run(root, "check-performance-budget.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.js gzip payload .* exceeds 20480 B/);
  });
});

test("critical first-render text retains the 45 KiB gzip ceiling", () => {
  withFixture({}, (root) => {
    write(root, "dist/index.html", randomBytes(47 * 1024));
    const result = run(root, "check-performance-budget.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Critical gzip payload .* exceeds 46080 B/);
  });
});

test("unexpected deployable file types fail", () => {
  withFixture({}, (root) => {
    write(root, "dist/video.mp4", "not really a video\n");
    const result = run(root, "check-performance-budget.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unexpected deployable file type \.mp4/);
  });
});

test("repository policy rejects unpinned actions", () => {
  withFixture({}, (root) => {
    const path = join(root, ".github/workflows/ci.yml");
    const workflow = readFileSync(path, "utf8")
      .replace(/actions\/checkout@[a-f0-9]{40}/, "actions/checkout@v4");
    writeFileSync(path, workflow);
    const result = run(root, "check-repository.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not pinned to a full SHA/);
  });
});

test("configuration paths cannot escape the repository", () => {
  withFixture({}, (root) => {
    const path = join(root, "web-design.config.json");
    const config = JSON.parse(readFileSync(path, "utf8"));
    config.performance.outputDirectory = "../outside";
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
    const result = run(root, "check-repository.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must stay inside the repository/);
  });
});
