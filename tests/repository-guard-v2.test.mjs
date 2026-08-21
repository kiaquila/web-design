import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { validateProjectConfig, validateWorkflowText } from "../scripts/check-repository.mjs";

const config = {
  schemaVersion: 1,
  project: { slug: "demo-site", profile: "no-deploy", productPaths: ["website/"] },
  commands: { check: [{ name: "site", run: "npm test" }] },
  deployment: { provider: "none", productionBranch: "main", rootDirectory: "." },
  governance: { source: "kiaquila/web-design", channel: "v1", mode: "consumer" }
};

test("accepts a valid single-project profile", () => {
  assert.deepEqual(validateProjectConfig(config, ["no-deploy"]), []);
});

test("enforces the deployment provider declared by the selected profile", () => {
  const invalid = structuredClone(config);
  invalid.deployment.provider = "cloudflare-workers";
  assert.deepEqual(
    validateProjectConfig(invalid, { "no-deploy": { deploymentProvider: "none" } }),
    ["deployment.provider must match profile no-deploy"]
  );
});

test("requires at least one real product check in consumer mode", () => {
  const invalid = structuredClone(config);
  invalid.commands.check = [];
  assert.deepEqual(
    validateProjectConfig(invalid, ["no-deploy"]),
    ["consumer projects must configure at least one product check"]
  );
});

test("rejects product checks that only report success", () => {
  for (const run of ["true", ":", "exit 0", "echo ok", "printf ok", "echo ok && true"]) {
    const invalid = structuredClone(config);
    invalid.commands.check = [{ name: "placeholder", run }];
    assert.deepEqual(
      validateProjectConfig(invalid, ["no-deploy"]),
      ["commands.check[0].run must execute a real product check"],
      run
    );
  }
});

test("rejects unsafe slugs, product paths, and unknown profiles", () => {
  const invalid = structuredClone(config);
  invalid.project.slug = "Demo Site";
  invalid.project.profile = "unknown";
  invalid.project.productPaths = ["../customer-data"];
  assert.equal(validateProjectConfig(invalid, ["no-deploy"]).length, 3);
});

test("rejects dangerous workflow triggers and mutable action refs", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: pull_request_target\npermissions:\n  contents: read\njobs:\n  test:\n    steps:\n      - uses: actions/checkout@v4\n"
  );
  assert.equal(failures.length, 2);
  assert.match(failures.join("\n"), /pull_request_target/);
  assert.match(failures.join("\n"), /full commit SHA/);
});

test("accepts a least-privilege workflow with a full SHA pin", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: push\npermissions:\n  contents: read\njobs:\n  test:\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n"
  );
  assert.deepEqual(failures, []);
});

test("rejects pull-request workflows with top-level write permissions", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: pull_request\npermissions:\n  contents: write\njobs:\n  test:\n    runs-on: ubuntu-latest\n"
  );
  assert.match(failures.join("\n"), /top-level write permissions/);
});

test("recognizes pull requests in every supported workflow trigger shape", () => {
  const triggers = [
    "on: pull_request",
    "on: [push, pull_request]",
    "on: [push, 'pull_request']",
    "on: { pull_request: {}, push: {} }",
    "on : { pull_request: {}, push: {} }",
    "'on': { 'pull_request': null, push: {} }",
    "on: {\n  push: {},\n  pull_request: { branches: [main] }\n}",
    "on:\n  push:\n  pull_request:\n    branches: [main]",
    "on:\n  - push\n  - pull_request"
  ];
  for (const trigger of triggers) {
    const failures = validateWorkflowText(
      ".github/workflows/example.yml",
      `${trigger}\npermissions:\n  contents: write\njobs:\n  test:\n    runs-on: ubuntu-latest\n`
    );
    assert.match(failures.join("\n"), /top-level write permissions/, trigger);
  }
});

test("does not confuse a nested branch name with a pull-request trigger", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on:\n  push:\n    branches: [pull_request]\npermissions:\n  contents: write\njobs:\n  test:\n    runs-on: ubuntu-latest\n"
  );
  assert.deepEqual(failures, []);
});

test("fails closed when a workflow trigger is supplied indirectly", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: *shared-events\npermissions:\n  contents: write\njobs:\n  test:\n    runs-on: ubuntu-latest\n"
  );
  assert.match(failures.join("\n"), /top-level write permissions/);
});

test("rejects flow-style pull-request permission grants", () => {
  for (const permissions of [
    "permissions: { contents: write }",
    "permissions: {\n  contents: write,\n  issues: read\n}"
  ]) {
    const failures = validateWorkflowText(
      ".github/workflows/example.yml",
      `on: { pull_request: {} }\n${permissions}\njobs:\n  test:\n    runs-on: ubuntu-latest\n`
    );
    assert.match(failures.join("\n"), /top-level write permissions/, permissions);
  }
});

test("rejects pull-request jobs with write permissions", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: pull_request\npermissions:\n  contents: read\njobs:\n  test:\n    permissions:\n      issues: write\n    runs-on: ubuntu-latest\n"
  );
  assert.match(failures.join("\n"), /job test may not grant write permissions/);
});

test("rejects flow-style job permissions on pull requests", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: pull_request\npermissions:\n  contents: read\njobs:\n  test:\n    permissions: { issues: write }\n    runs-on: ubuntu-latest\n"
  );
  assert.match(failures.join("\n"), /job test may not grant write permissions/);
});

test("allows a write-capable job gated strictly to manual dispatch", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: [pull_request, workflow_dispatch]\npermissions:\n  contents: read\njobs:\n  publish:\n    if: ${{ github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' }}\n    permissions:\n      contents: write\n    runs-on: ubuntu-latest\n"
  );
  assert.deepEqual(failures, []);
});

test("rejects write-capable jobs whose condition also admits pull requests", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: [pull_request, workflow_dispatch]\npermissions:\n  contents: read\njobs:\n  publish:\n    if: ${{ github.event_name == 'workflow_dispatch' || github.event_name == 'pull_request' }}\n    permissions:\n      contents: write\n    runs-on: ubuntu-latest\n"
  );
  assert.match(failures.join("\n"), /job publish may not grant write permissions/);
});

test("workflow jobs that execute Node install the pinned runtime first", () => {
  const workflows = readdirSync(resolve(".github/workflows"))
    .filter((file) => file.endsWith(".yml"));
  const setupNode = "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020";
  for (const file of workflows) {
    const workflow = readFileSync(resolve(".github/workflows", file), "utf8");
    const jobBlocks = workflow
      .split(/^jobs:\s*$/m)[1]
      ?.split(/(?=^  [A-Za-z0-9_-]+:\s*$)/m)
      .filter((block) => /^  [A-Za-z0-9_-]+:\s*$/m.test(block)) ?? [];
    for (const job of jobBlocks) {
      if (!/^\s+run:\s*node\b/m.test(job) && !/^\s+run:\s*[|>]\s*$[\s\S]*?^\s+node\b/m.test(job)) {
        continue;
      }
      const nodeCommand = job.search(/^\s+run:\s*node\s+|^\s+node\s+/m);
      const setup = job.indexOf(setupNode);
      assert.ok(setup !== -1 && setup < nodeCommand, `${file} must set up pinned Node before executing it`);
      assert.match(job.slice(setup, nodeCommand), /node-version:\s*["']22\.18\.0["']/);
    }
  }
});

test("project CI installs lockfile dependencies before running configured checks", () => {
  const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
  const install = workflow.indexOf("npm ci --prefix");
  const checks = workflow.indexOf("node scripts/run-project-checks.mjs");
  assert.match(workflow, /-name package-lock\.json -o -name npm-shrinkwrap\.json/);
  assert.ok(install !== -1 && install < checks);
});

test("CODEOWNERS protects every managed and release-control path", () => {
  const codeowners = readFileSync(resolve(".github/CODEOWNERS"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/)[0]);
  const managed = JSON.parse(readFileSync(resolve(".web-design/managed-files.json"), "utf8"));
  const paths = [
    ...managed.files,
    ".web-design/lock.json",
    ".web-design/release-manifest.json"
  ];
  for (const path of paths) {
    assert.ok(
      codeowners.some((pattern) => {
        const normalized = pattern.replace(/^\//, "");
        return normalized.endsWith("/") ? path.startsWith(normalized) : path === normalized;
      }),
      `${path} must be covered by CODEOWNERS`
    );
  }
});

test("trusted baseline verification is repository-identity and run-SHA bound", () => {
  const workflow = readFileSync(resolve(".github/workflows/baseline-source-verification.yml"), "utf8");
  const codeowners = readFileSync(resolve(".github/CODEOWNERS"), "utf8");
  assert.match(workflow, /GITHUB_REPOSITORY" != "kiaquila\/web-design"/);
  assert.match(workflow, /RUN_HEAD_SHA" != "\$ASSOCIATED_HEAD_SHA"/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(workflow, /HEAD_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(codeowners, /^\/\.github\/ @kiaquila$/m);
});

test("repository guard uses branch policy only for the template-v2 bootstrap", () => {
  const workflow = readFileSync(resolve(".github/workflows/repository-guard.yml"), "utf8");
  assert.equal((workflow.match(/\.guard-trusted\/\.web-design\/project\.json/g) ?? []).length, 2);
  assert.match(workflow, /Template-v2 policy is not on the default branch yet/);
  assert.match(workflow, /Managed baseline policy is not on the default branch yet/);
});

test("GitHub setup records the plan-limited manual protection fallback", () => {
  const setup = readFileSync(resolve("docs/operations/github-setup.md"), "utf8");
  assert.match(setup, /when the repository plan supports it/i);
  assert.match(setup, /exact full head SHA/);
  assert.match(setup, /P0-P2/);
  assert.match(setup, /120-second quiet\s+period/);
  assert.match(setup, /Do not make a private repository public/);
});
