#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CLOUDFLARE_APP_SLUG = "cloudflare-workers-and-pages";
const CHECK_NAME_PREFIX = "Workers Builds: ";
const WORKERS_DOMAIN = "ks-design.workers.dev";
const ZERO_SHA = /^0{40}$/;

function assertProjectSlug(value) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`Invalid stage project slug: ${JSON.stringify(value)}`);
  }
}

export function configuredStages(config) {
  const entries = Object.entries(config.stageProjects ?? {});

  return entries.map(([project, stage]) => {
    assertProjectSlug(project);
    if (stage?.watchPath !== `${project}/*`) {
      throw new Error(`Stage ${project} must use watch path ${project}/*`);
    }

    return {
      project,
      environment: `${project} / stage`,
      checkName: `${CHECK_NAME_PREFIX}${project}`,
      url: `https://${project}.${WORKERS_DOMAIN}`
    };
  });
}

export function selectChangedStages(stages, changedFiles) {
  return stages.filter(({ project }) =>
    changedFiles.some((file) => file === project || file.startsWith(`${project}/`))
  );
}

export function matchingCloudflareCheck(checks, checkName) {
  return checks
    .filter(
      (check) =>
        check?.app?.slug === CLOUDFLARE_APP_SLUG && check.name === checkName
    )
    .sort((left, right) => Number(right.id) - Number(left.id))[0];
}

export function changedFiles(root, beforeSha, targetSha) {
  if (!beforeSha || ZERO_SHA.test(beforeSha)) return null;

  const result = spawnSync(
    "git",
    [
      "diff",
      "--no-renames",
      "--name-only",
      "--diff-filter=ACMRTD",
      beforeSha,
      targetSha
    ],
    { cwd: root, encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git diff failed");
  }

  return result.stdout.split("\n").filter(Boolean);
}

class GitHubApi {
  constructor(repository, token) {
    if (!/^[^/]+\/[^/]+$/.test(repository)) {
      throw new Error("GITHUB_REPOSITORY must have the owner/repository form");
    }
    if (!token) throw new Error("GITHUB_TOKEN is required");

    this.repository = repository;
    this.token = token;
  }

  async request(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        ...options.headers
      },
      body:
        options.body === undefined || typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
    });

    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      throw new Error(
        `GitHub API ${options.method ?? "GET"} ${path} failed: ` +
          `${response.status} ${body?.message ?? response.statusText}`
      );
    }
    return body;
  }
}

const wait = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

export async function waitForSuccessfulCloudflareCheck({
  api,
  repository,
  sha,
  checkName,
  attempts = 80,
  intervalMs = 15_000,
  delay = wait
}) {
  const encodedSha = encodeURIComponent(sha);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await api.request(
      `/repos/${repository}/commits/${encodedSha}/check-runs?per_page=100`
    );
    const check = matchingCloudflareCheck(response.check_runs ?? [], checkName);

    if (check?.status === "completed") {
      if (check.conclusion === "success") return check;
      throw new Error(
        `${checkName} completed with ${check.conclusion ?? "an unknown conclusion"}: ` +
          `${check.details_url ?? "no build URL"}`
      );
    }

    if (attempt === 1 || attempt % 8 === 0) {
      const state = check?.status ?? "not created yet";
      console.log(`[${checkName}] waiting for Cloudflare (${state}, ${attempt}/${attempts})`);
    }
    if (attempt < attempts) await delay(intervalMs);
  }

  throw new Error(`${checkName} did not complete before the polling timeout`);
}

function deploymentPayload(deployment) {
  if (typeof deployment?.payload === "string") {
    try {
      return JSON.parse(deployment.payload);
    } catch {
      return {};
    }
  }
  return deployment?.payload ?? {};
}

export async function registerSuccessfulDeployment({
  api,
  repository,
  sha,
  stage,
  check
}) {
  const query = new URLSearchParams({
    sha,
    environment: stage.environment,
    per_page: "100"
  });
  const existing = await api.request(
    `/repos/${repository}/deployments?${query.toString()}`
  );
  let deployment = existing.find(
    (item) =>
      String(deploymentPayload(item).cloudflare_check_run_id) === String(check.id)
  );

  if (!deployment) {
    deployment = await api.request(`/repos/${repository}/deployments`, {
      method: "POST",
      body: {
        ref: sha,
        task: "deploy",
        auto_merge: false,
        required_contexts: [],
        environment: stage.environment,
        description: `Cloudflare Workers Build ${check.id}`,
        transient_environment: false,
        production_environment: false,
        payload: {
          source: "cloudflare-workers-builds",
          cloudflare_check_run_id: check.id
        }
      }
    });
  } else {
    const statuses = await api.request(
      `/repos/${repository}/deployments/${deployment.id}/statuses?per_page=100`
    );
    if (statuses.some((status) => status.state === "success")) {
      console.log(`[${stage.project}] deployment ${deployment.id} is already registered`);
      return deployment;
    }
  }

  await api.request(`/repos/${repository}/deployments/${deployment.id}/statuses`, {
    method: "POST",
    body: {
      state: "success",
      environment: stage.environment,
      environment_url: stage.url,
      log_url: check.details_url,
      description: "Cloudflare Workers deployment succeeded.",
      auto_inactive: true
    }
  });

  console.log(`[${stage.project}] registered ${stage.environment}: ${stage.url}`);
  return deployment;
}

async function main() {
  const root = resolve(import.meta.dirname, "..");
  const config = JSON.parse(readFileSync(resolve(root, ".repo-guard.json"), "utf8"));
  const stages = configuredStages(config);
  const requestedProject = process.env.STAGE_PROJECT?.trim();
  const targetSha = process.env.TARGET_SHA?.trim();
  const beforeSha = process.env.BEFORE_SHA?.trim();

  if (!targetSha) throw new Error("TARGET_SHA is required");

  let selected;
  if (requestedProject) {
    selected =
      requestedProject === "all"
        ? stages
        : stages.filter(({ project }) => project === requestedProject);
    if (selected.length === 0) {
      throw new Error(`Unknown stage project: ${requestedProject}`);
    }
  } else {
    const files = changedFiles(root, beforeSha, targetSha);
    selected = files === null ? stages : selectChangedStages(stages, files);
  }

  if (selected.length === 0) {
    console.log("No permanent Cloudflare stage was affected by this push.");
    return;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const api = new GitHubApi(repository, process.env.GITHUB_TOKEN);
  const results = await Promise.allSettled(
    selected.map(async (stage) => {
      const check = await waitForSuccessfulCloudflareCheck({
        api,
        repository,
        sha: targetSha,
        checkName: stage.checkName
      });
      return registerSuccessfulDeployment({
        api,
        repository,
        sha: targetSha,
        stage,
        check
      });
    })
  );

  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) console.error(failure.reason);
  if (failures.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
