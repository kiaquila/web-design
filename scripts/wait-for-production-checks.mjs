#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_ATTEMPTS = 120;

export const PUSH_CHECKS = Object.freeze([
  "repository-guard",
  "alex-neon-website",
  "alphacentr-site",
  "chaijana-menu",
  "chaijana-website",
  "ks-website",
  "osv-scan"
]);

export const PULL_REQUEST_CHECKS = Object.freeze([
  ...PUSH_CHECKS,
  "Codex Review"
]);

export function latestChecksByName(checkRuns) {
  const latest = new Map();
  for (const check of checkRuns ?? []) {
    if (!check?.name) continue;
    const previous = latest.get(check.name);
    if (!previous || Number(check.id) > Number(previous.id)) {
      latest.set(check.name, check);
    }
  }
  return latest;
}

export function evaluateRequiredChecks(checkRuns, requiredNames) {
  const latest = latestChecksByName(checkRuns);
  const missing = [];
  const pending = [];
  const failed = [];

  for (const name of requiredNames) {
    const check = latest.get(name);
    if (!check) missing.push(name);
    else if (check.status !== "completed") pending.push(name);
    else if (check.conclusion !== "success") {
      failed.push({
        name,
        conclusion: check.conclusion ?? "unknown",
        url: check.details_url ?? ""
      });
    }
  }

  return { missing, pending, failed };
}

export function selectMergedPullRequest(pullRequests, baseBranch = "main") {
  return (pullRequests ?? [])
    .filter((pull) => pull?.merged_at && pull?.base?.ref === baseBranch && pull?.head?.sha)
    .sort((left, right) => String(right.merged_at).localeCompare(String(left.merged_at)))[0];
}

class GitHubApi {
  constructor(repository, token) {
    if (!/^[^/]+\/[^/]+$/.test(repository ?? "")) {
      throw new Error("GITHUB_REPOSITORY must have the owner/repository form");
    }
    if (!token) throw new Error("GITHUB_TOKEN is required");
    this.repository = repository;
    this.token = token;
  }

  async request(path) {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        `GitHub API GET ${path} failed: ${response.status} ${body?.message ?? response.statusText}`
      );
    }
    return body;
  }
}

const delay = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function checkRuns(api, sha) {
  const encodedSha = encodeURIComponent(sha);
  const response = await api.request(
    `/repos/${api.repository}/commits/${encodedSha}/check-runs?filter=latest&per_page=100`
  );
  return response.check_runs ?? [];
}

export async function waitForRequiredChecks({
  api,
  sha,
  requiredNames,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  wait = delay
}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const state = evaluateRequiredChecks(await checkRuns(api, sha), requiredNames);
    if (state.failed.length > 0) {
      const details = state.failed
        .map(({ name, conclusion, url }) => `${name}: ${conclusion}${url ? ` (${url})` : ""}`)
        .join("; ");
      throw new Error(`Required checks failed for ${sha}: ${details}`);
    }
    if (state.missing.length === 0 && state.pending.length === 0) return;

    if (attempt === 1 || attempt % 8 === 0) {
      console.log(
        `Waiting for checks on ${sha} (${attempt}/${attempts}); ` +
          `missing: ${state.missing.join(", ") || "none"}; ` +
          `pending: ${state.pending.join(", ") || "none"}`
      );
    }
    if (attempt < attempts) await wait(intervalMs);
  }
  throw new Error(`Required checks did not complete for ${sha} before the polling timeout`);
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const targetSha = process.env.TARGET_SHA?.trim();
  if (!/^[a-f0-9]{40}$/.test(targetSha ?? "")) {
    throw new Error("TARGET_SHA must be a full hexadecimal commit SHA");
  }

  const api = new GitHubApi(repository, process.env.GITHUB_TOKEN);
  await waitForRequiredChecks({ api, sha: targetSha, requiredNames: PUSH_CHECKS });

  const pullRequests = await api.request(
    `/repos/${repository}/commits/${encodeURIComponent(targetSha)}/pulls?per_page=100`
  );
  const pullRequest = selectMergedPullRequest(pullRequests);
  if (!pullRequest) {
    throw new Error(
      `Production revision ${targetSha} is not associated with a merged pull request into main`
    );
  }

  await waitForRequiredChecks({
    api,
    sha: pullRequest.head.sha,
    requiredNames: PULL_REQUEST_CHECKS,
    attempts: 1,
    intervalMs: 0
  });
  console.log(
    `Production gates passed for ${targetSha} from merged PR #${pullRequest.number} ` +
      `at reviewed head ${pullRequest.head.sha}.`
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
