import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "..");
const guardScript = join(repositoryRoot, "scripts/check-repository.mjs");
const checkoutSha = "34e114876b0b11c390a56381ad16ebd13914f8d5";

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
  write(root, ".gitignore", "node_modules/\ndist/\n");
  write(
    root,
    ".repo-guard.json",
    JSON.stringify({
      infrastructureDirectories: ["docs", "scripts", "tests"],
      projects: ["demo"]
    })
  );
  write(root, "AGENTS.md");
  write(root, "CLAUDE.md");
  write(root, "README.md", "[Demo](./demo/)\n");
  write(root, "demo/AGENTS.md");
  write(root, "demo/README.md");
  write(root, "docs/repository-guardrails.md");
  write(root, "docs/stage-hosting.md");
  write(root, "scripts/codex-review-gate.mjs");
  write(root, "scripts/codex-review-helpers.mjs");
  write(root, "scripts/codex-review-request.mjs");
  write(root, "scripts/codex-review-rerun.mjs");
  write(root, "tests/codex-review-gate.test.mjs");
  write(root, "tests/repository-guard.test.mjs");
  write(root, "third-party-notices.md");
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(guardScript, join(root, "scripts/check-repository.mjs"));
  write(
    root,
    ".github/workflows/codex-review.yml",
    [
      "name: Codex Review",
      "on:",
      "  pull_request:",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  codex-review:",
      "    name: Codex Review",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${checkoutSha}`,
      "      - name: Checkout trusted Codex review gate",
      `        uses: actions/checkout@${checkoutSha}`,
      "        with:",
      "          ref: ${{ github.event.repository.default_branch }}",
      "          path: .codex-review-trusted",
      "      - run: |",
      "          script_root=\"$GITHUB_WORKSPACE/.codex-review-trusted\"",
      "          node \"$script_root/scripts/codex-review-gate.mjs\"",
      ""
    ].join("\n")
  );
  write(
    root,
    ".github/workflows/codex-review-request.yml",
    [
      "name: Codex Review Request",
      "on: issue_comment",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  request:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${checkoutSha}`,
      ""
    ].join("\n")
  );
  write(
    root,
    ".github/workflows/codex-review-rerun.yml",
    [
      "name: Codex Review Rerun",
      "on: pull_request_review",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  rerun:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${checkoutSha}`,
      ""
    ].join("\n")
  );
  write(
    root,
    ".github/workflows/repository-guard.yml",
    [
      "name: Guard",
      "on: push",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  guard:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${checkoutSha}`,
      ""
    ].join("\n")
  );
  git(root, "init", "-q");
  git(root, "add", "-A");
  return root;
}

function runGuard(root) {
  return spawnSync(process.execPath, [guardScript, "--root", root], {
    encoding: "utf8"
  });
}

function withFixture(run) {
  const root = makeFixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts a minimal conforming project", () => {
  withFixture((root) => {
    const result = runGuard(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Repository guard passed/);
  });
});

test("accepts a project-named Worker with the temporary stage contract", () => {
  withFixture((root) => {
    write(
      root,
      ".repo-guard.json",
      JSON.stringify({
        infrastructureDirectories: ["docs", "scripts", "tests"],
        projects: ["demo"],
        stageProjects: {
          demo: {
            rootDirectory: "demo/website",
            watchPath: "demo/*"
          }
        }
      })
    );
    write(
      root,
      "demo/website/package.json",
      JSON.stringify({
        scripts: {
          build: "vite build",
          "stage:deploy":
            "WRANGLER_WRITE_LOGS=false WRANGLER_LOG_PATH=.wrangler/wrangler.log wrangler deploy",
          "stage:preview":
            "WRANGLER_WRITE_LOGS=false WRANGLER_LOG_PATH=.wrangler/wrangler.log wrangler versions upload"
        }
      })
    );
    write(
      root,
      "demo/website/wrangler.json",
      JSON.stringify({
        name: "demo",
        main: "./worker/index.ts",
        compatibility_date: "2026-08-05",
        compatibility_flags: ["nodejs_compat"],
        workers_dev: true,
        preview_urls: true
      })
    );
    write(root, "demo/website/worker/index.ts");
    git(root, "add", "-A");

    const result = runGuard(root);
    assert.equal(result.status, 0, result.stderr);
  });
});

test("rejects a stage Worker whose name differs from the project slug", () => {
  withFixture((root) => {
    write(
      root,
      ".repo-guard.json",
      JSON.stringify({
        infrastructureDirectories: ["docs", "scripts", "tests"],
        projects: ["demo"],
        stageProjects: {
          demo: {
            rootDirectory: "demo/website",
            watchPath: "demo/*"
          }
        }
      })
    );
    write(
      root,
      "demo/website/package.json",
      JSON.stringify({
        scripts: {
          build: "vite build",
          "stage:deploy":
            "WRANGLER_WRITE_LOGS=false WRANGLER_LOG_PATH=.wrangler/wrangler.log wrangler deploy",
          "stage:preview":
            "WRANGLER_WRITE_LOGS=false WRANGLER_LOG_PATH=.wrangler/wrangler.log wrangler versions upload"
        }
      })
    );
    write(
      root,
      "demo/website/wrangler.json",
      JSON.stringify({
        name: "web-design-demo",
        main: "./worker/index.ts",
        compatibility_date: "2026-08-05",
        compatibility_flags: ["nodejs_compat"],
        workers_dev: true,
        preview_urls: true
      })
    );
    git(root, "add", "-A");

    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must be named demo/);
  });
});

test("rejects a known token signature", () => {
  withFixture((root) => {
    const token = ["ghp", "A".repeat(32)].join("_");
    write(root, "credentials.txt", `${token}\n`);
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token/);
  });
});

test("rejects personal absolute paths", () => {
  withFixture((root) => {
    const personalPath = ["", "Users", "example", "project", "file.txt"].join("/");
    write(root, "notes.md", `${personalPath}\n`);
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Personal absolute path/);
  });
});

test("rejects unpinned GitHub Actions", () => {
  withFixture((root) => {
    write(
      root,
      ".github/workflows/repository-guard.yml",
      "name: Guard\non: push\npermissions:\n  contents: read\njobs:\n" +
        "  guard:\n    runs-on: ubuntu-latest\n    steps:\n" +
        "      - uses: actions/checkout@v4\n"
    );
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not pinned to a full commit SHA/);
  });
});

test("rejects unclassified top-level directories", () => {
  withFixture((root) => {
    write(root, "unlisted-project/README.md");
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unclassified top-level directory/);
  });
});

test("rejects removal of the Codex review gate", () => {
  withFixture((root) => {
    rmSync(join(root, "scripts/codex-review-gate.mjs"));
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing required repository file: scripts\/codex-review-gate\.mjs/);
  });
});

test("rejects a Codex Review workflow without its trusted gate", () => {
  withFixture((root) => {
    write(
      root,
      ".github/workflows/codex-review.yml",
      [
        "name: Codex Review",
        "on:",
        "  pull_request:",
        "permissions:",
        "  contents: read",
        "jobs:",
        "  codex-review:",
        "    name: Codex Review",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - run: true",
        ""
      ].join("\n")
    );
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Codex Review workflow is missing trusted gate invariant/);
  });
});

test("rejects commented-out Codex Review gate invariants", () => {
  withFixture((root) => {
    write(root, ".github/workflows/codex-review.yml", [
      "name: Codex Review", "on:", "  pull_request:", "permissions:",
      "  contents: read", "jobs:", "  codex-review:", "    name: Codex Review",
      "    runs-on: ubuntu-latest", "    steps:", "      - run: true",
      "# name: Checkout trusted Codex review gate",
      "# ref: ${{ github.event.repository.default_branch }}",
      "# path: .codex-review-trusted",
      "# node \"$script_root/scripts/codex-review-gate.mjs\"", ""
    ].join("\n"));
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Codex Review workflow is missing trusted gate invariant/);
  });
});
