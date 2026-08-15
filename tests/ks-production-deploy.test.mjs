import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  PULL_REQUEST_CHECKS,
  PUSH_CHECKS,
  evaluateRequiredChecks,
  selectMergedPullRequest
} from "../scripts/wait-for-production-checks.mjs";

const root = resolve(import.meta.dirname, "..");
const workflow = await readFile(
  resolve(root, ".github/workflows/ks-production-deploy.yml"),
  "utf8"
);

test("production deploy is push-only, KS-scoped, main-only, and serialized", () => {
  assert.match(workflow, /^on:\n  push:\n/m);
  assert.match(workflow, /branches:\n\s+- main/);
  assert.match(workflow, /paths:\n\s+- "ks\/\*\*"/);
  assert.doesNotMatch(workflow, /^\s*pull_request:/m);
  const deployJob = workflow.slice(workflow.indexOf("  deploy:"));
  assert.match(deployJob, /lock_file=\/tmp\/ks-production-deploy\.lock/);
  assert.match(deployJob, /flock --exclusive 9/);
  assert.match(workflow, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(deployJob, /git rev-parse "\$REVISION:ks"/);
  assert.match(deployJob, /git rev-parse "origin\/main:ks"/);
});

test("production credentials are isolated to the production environment", () => {
  const gateJob = workflow.slice(workflow.indexOf("  required-checks:"), workflow.indexOf("  deploy:"));
  const deployJob = workflow.slice(workflow.indexOf("  deploy:"));
  assert.doesNotMatch(gateJob, /secrets\./);
  assert.match(deployJob, /environment:\n\s+name: production/);
  assert.deepEqual(
    [...deployJob.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((match) => match[1]).sort(),
    ["CLOUDFLARE_API_TOKEN"]
  );
  assert.match(deployJob, /runs-on: \[self-hosted, linux, x64, ks-production\]/);
  assert.match(deployJob, /KS_DESIGN_DEPLOY_TARGET: local/);
});

test("production deploy verifies the revision, pages, cache purge, and asset hash", () => {
  assert.match(workflow, /KS_DESIGN_EXPECTED_REVISION: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /ks\/website\/production\/deploy\.sh/);
  assert.match(workflow, /https:\/\/ks-design\.art\/en\//);
  assert.match(workflow, /purge_cache/);
  assert.match(workflow, /sha256sum ks\/website\/src\/js\/site\.js/);
  assert.ok(workflow.indexOf("purge_cache") < workflow.indexOf("https://ks-design.art/en/"));
});

test("required checks include every push gate and the PR-only Codex gate", () => {
  assert.deepEqual(PULL_REQUEST_CHECKS, [...PUSH_CHECKS, "Codex Review"]);
  assert.ok(PUSH_CHECKS.includes("repository-guard"));
  assert.ok(PUSH_CHECKS.includes("ks-website"));
  assert.ok(PUSH_CHECKS.includes("osv-scan"));
});

test("required check evaluation uses the newest run and fails closed", () => {
  const state = evaluateRequiredChecks(
    [
      { id: 1, name: "gate", status: "completed", conclusion: "failure" },
      { id: 2, name: "gate", status: "completed", conclusion: "success" },
      { id: 3, name: "pending", status: "in_progress" }
    ],
    ["gate", "pending", "missing"]
  );
  assert.deepEqual(state, {
    missing: ["missing"],
    pending: ["pending"],
    failed: []
  });
});

test("only a merged pull request into main can authorize production", () => {
  assert.equal(selectMergedPullRequest([{ number: 1, merged_at: null }]), undefined);
  assert.equal(
    selectMergedPullRequest([
      {
        number: 2,
        merged_at: "2026-08-14T12:00:00Z",
        base: { ref: "release" },
        head: { sha: "a".repeat(40) }
      },
      {
        number: 3,
        merged_at: "2026-08-14T13:00:00Z",
        base: { ref: "main" },
        head: { sha: "b".repeat(40) }
      }
    ]).number,
    3
  );
});
