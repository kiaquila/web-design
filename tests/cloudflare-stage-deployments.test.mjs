import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  changedFiles,
  configuredStages,
  matchingCloudflareCheck,
  registerSuccessfulDeployment,
  selectChangedStages,
  waitForSuccessfulCloudflareCheck
} from "../scripts/register-cloudflare-stage-deployments.mjs";

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("derives a permanent environment and URL for each configured stage", () => {
  assert.deepEqual(
    configuredStages({
      stageProjects: {
        chaijana: {
          rootDirectory: "chaijana/website",
          watchPath: "chaijana/*"
        }
      }
    }),
    [
      {
        project: "chaijana",
        environment: "chaijana / stage",
        checkName: "Workers Builds: chaijana",
        url: "https://chaijana.ks-design.workers.dev"
      }
    ]
  );
});

test("selects only stages whose project paths changed", () => {
  const stages = configuredStages({
    stageProjects: {
      alpha: { watchPath: "alpha/*" },
      beta: { watchPath: "beta/*" }
    }
  });

  assert.deepEqual(
    selectChangedStages(stages, ["README.md", "beta/site/index.html"]),
    [stages[1]]
  );
  assert.deepEqual(selectChangedStages(stages, ["docs/stage-hosting.md"]), []);
});

test("keeps the source path when a staged file is renamed elsewhere", () => {
  const root = mkdtempSync(join(tmpdir(), "web-design-stage-diff-"));
  try {
    git(root, "init", "-q");
    git(root, "config", "user.name", "Test");
    git(root, "config", "user.email", "test@example.com");
    mkdirSync(join(root, "chaijana"));
    mkdirSync(join(root, "docs"));
    writeFileSync(join(root, "chaijana", "page.html"), "stage\n");
    git(root, "add", ".");
    git(root, "commit", "-qm", "Add stage file");
    const before = git(root, "rev-parse", "HEAD");

    renameSync(
      join(root, "chaijana", "page.html"),
      join(root, "docs", "page.html")
    );
    git(root, "add", "-A");
    git(root, "commit", "-qm", "Move stage file");
    const after = git(root, "rev-parse", "HEAD");

    assert.deepEqual(changedFiles(root, before, after), [
      "chaijana/page.html",
      "docs/page.html"
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("matches only the newest check from the Cloudflare app", () => {
  const checks = [
    {
      id: 10,
      name: "Workers Builds: chaijana",
      app: { slug: "another-app" }
    },
    {
      id: 11,
      name: "Workers Builds: chaijana",
      app: { slug: "cloudflare-workers-and-pages" }
    },
    {
      id: 12,
      name: "Workers Builds: chaijana",
      app: { slug: "cloudflare-workers-and-pages" }
    }
  ];

  assert.equal(matchingCloudflareCheck(checks, "Workers Builds: chaijana").id, 12);
});

test("waits until the Cloudflare check succeeds", async () => {
  const responses = [
    { check_runs: [] },
    {
      check_runs: [
        {
          id: 42,
          name: "Workers Builds: chaijana",
          status: "completed",
          conclusion: "success",
          app: { slug: "cloudflare-workers-and-pages" }
        }
      ]
    }
  ];
  const api = {
    request: async () => responses.shift()
  };

  const check = await waitForSuccessfulCloudflareCheck({
    api,
    repository: "owner/repository",
    sha: "abc123",
    checkName: "Workers Builds: chaijana",
    attempts: 2,
    intervalMs: 0,
    delay: async () => {}
  });

  assert.equal(check.id, 42);
});

test("creates a successful deployment linked to Cloudflare", async () => {
  const calls = [];
  const responses = [
    [],
    { id: 7, payload: { cloudflare_check_run_id: 42 } },
    { id: 8, state: "success" }
  ];
  const api = {
    request: async (path, options = {}) => {
      calls.push({ path, options });
      return responses.shift();
    }
  };

  await registerSuccessfulDeployment({
    api,
    repository: "owner/repository",
    sha: "abc123",
    stage: {
      project: "chaijana",
      environment: "chaijana / stage",
      url: "https://chaijana.ks-design.workers.dev"
    },
    check: {
      id: 42,
      details_url: "https://dash.cloudflare.com/build/42"
    }
  });

  assert.equal(calls.length, 3);
  assert.equal(calls[1].options.body.environment, "chaijana / stage");
  assert.equal(calls[1].options.body.production_environment, false);
  assert.equal(
    calls[2].options.body.environment_url,
    "https://chaijana.ks-design.workers.dev"
  );
  assert.equal(calls[2].options.body.log_url, "https://dash.cloudflare.com/build/42");
});

test("does not refresh the timestamp for an already registered check", async () => {
  const calls = [];
  const api = {
    request: async (path, options = {}) => {
      calls.push({ path, options });
      if (calls.length === 1) {
        return [{ id: 7, payload: { cloudflare_check_run_id: 42 } }];
      }
      return [{ state: "success" }];
    }
  };

  await registerSuccessfulDeployment({
    api,
    repository: "owner/repository",
    sha: "abc123",
    stage: {
      project: "chaijana",
      environment: "chaijana / stage",
      url: "https://chaijana.ks-design.workers.dev"
    },
    check: {
      id: 42,
      details_url: "https://dash.cloudflare.com/build/42"
    }
  });

  assert.equal(calls.length, 2);
  assert.equal(calls.every(({ options }) => options.method === undefined), true);
});
