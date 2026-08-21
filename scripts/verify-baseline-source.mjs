#!/usr/bin/env node

// Trusted-policy validation for baseline-source-verification.yml. The logic
// lives here rather than in workflow shell because that job holds write
// permissions beside the isolated `.baseline-proposed` checkout, where the
// repository guard refuses any run text that touches the step environment
// files. This script is a managed, hash-locked file, so its writes to
// `GITHUB_OUTPUT` carry provenance the workflow scan cannot establish for
// free-form shell.

import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

function runNode(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv }
  });
  return result.status === 0;
}

const {
  ASSOCIATED_HEAD_SHA,
  BASE_SHA,
  GITHUB_OUTPUT,
  GITHUB_REPOSITORY,
  GITHUB_WORKSPACE,
  GUARD_CONCLUSION,
  RUN_HEAD_SHA,
  SOURCE_TOKEN
} = process.env;

if (!GITHUB_OUTPUT || !GITHUB_WORKSPACE) {
  console.error("GITHUB_OUTPUT and GITHUB_WORKSPACE must be set.");
  process.exit(1);
}

const proposed = join(GITHUB_WORKSPACE, ".baseline-proposed");
let conclusion = "success";
let summary = "Managed baseline is unchanged or matches its pinned source.";

if ((RUN_HEAD_SHA ?? "") !== (ASSOCIATED_HEAD_SHA ?? "")) {
  conclusion = "failure";
  summary = "Repository Guard SHA does not match the associated pull-request head.";
} else if (GUARD_CONCLUSION !== "success") {
  conclusion = "failure";
  summary = "Repository Guard did not pass for this pull-request head.";
} else if (GITHUB_REPOSITORY !== "kiaquila/web-design") {
  const matches = runNode(
    [
      "scripts/check-baseline-change.mjs",
      "--proposed",
      proposed,
      "--trusted",
      GITHUB_WORKSPACE,
      "--base-sha",
      BASE_SHA ?? ""
    ],
    { GH_TOKEN: SOURCE_TOKEN ?? "" }
  );
  if (!matches) {
    conclusion = "failure";
    summary = "Proposed managed bytes do not match the pinned web-design source.";
  }
} else if (
  !runNode(["scripts/check-repository.mjs", "--root", proposed]) ||
  !runNode(["scripts/check-managed-files.mjs", proposed])
) {
  conclusion = "failure";
  summary = "Canonical source release manifest or managed hashes are invalid.";
} else {
  summary = "Canonical source release manifest and managed hashes match.";
}

appendFileSync(GITHUB_OUTPUT, `conclusion=${conclusion}\nsummary=${summary}\n`);
