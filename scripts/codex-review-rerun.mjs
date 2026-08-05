#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isTrustedCodexLogin } from "./codex-review-helpers.mjs";

const RERUNNABLE_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required"
]);
const ACTIVE_STATUSES = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending"
]);

export function shouldRouteCodexReviewRerunEvent(event) {
  if (event?.review) return isTrustedCodexLogin(event.review.user?.login);
  if (!event?.issue?.pull_request || !event?.comment) return false;
  return /^Codex Review:/i.test(String(event.comment.body || "")) &&
    isTrustedCodexLogin(event.comment.user?.login);
}

export function selectCodexReviewRun(runs = [], headSha) {
  const matchingRuns = runs
    .filter((run) => run.event === "pull_request" && run.head_sha === headSha)
    .sort((left, right) =>
      Date.parse(right.created_at || "") - Date.parse(left.created_at || "")
    );

  const activeRun = matchingRuns.find((run) => ACTIVE_STATUSES.has(run.status));
  if (activeRun) return { action: "already_running", run: activeRun };

  const rerunnableRun = matchingRuns.find((run) =>
    run.status === "completed" && RERUNNABLE_CONCLUSIONS.has(run.conclusion)
  );
  if (rerunnableRun) return { action: "rerun", run: rerunnableRun };

  const successfulRun = matchingRuns.find((run) =>
    run.status === "completed" && run.conclusion === "success"
  );
  if (successfulRun) return { action: "already_success", run: successfulRun };

  return { action: "not_found", run: null };
}

async function defaultRequest(token, repository, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

export async function rerunCodexReviewForHead({
  token,
  repository,
  headSha,
  request = defaultRequest
}) {
  if (!token || !repository || !headSha) {
    throw new Error("token, repository, and headSha are required to rerun Codex Review.");
  }

  const [owner, repo] = repository.split("/");
  const data = await request(
    token,
    repository,
    `/repos/${owner}/${repo}/actions/workflows/codex-review.yml/runs?event=pull_request&head_sha=${encodeURIComponent(headSha)}&per_page=100`
  );
  const selected = selectCodexReviewRun(data.workflow_runs || [], headSha);

  if (selected.action === "rerun") {
    await request(
      token,
      repository,
      `/repos/${owner}/${repo}/actions/runs/${selected.run.id}/rerun`,
      { method: "POST" }
    );
    return {
      ...selected,
      message: `Requested Codex Review rerun for ${headSha} from run ${selected.run.id}.`
    };
  }

  const runId = selected.run?.id ? ` run ${selected.run.id}` : "";
  const messages = {
    already_running: `Codex Review is already running for ${headSha}${runId}.`,
    already_success: `Codex Review already passed for ${headSha}${runId}.`,
    not_found: `No completed Codex Review pull_request run found for ${headSha}.`
  };
  return { ...selected, message: messages[selected.action] };
}

async function resolveHeadSha({ token, repository, event, request = defaultRequest }) {
  if (event?.pull_request?.head?.sha) return event.pull_request.head.sha;
  if (!event?.issue?.pull_request || !event?.issue?.number) {
    throw new Error("Could not resolve pull request from event.");
  }
  const [owner, repo] = repository.split("/");
  const pull = await request(
    token,
    repository,
    `/repos/${owner}/${repo}/pulls/${event.issue.number}`
  );
  return pull.head?.sha;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath) {
    throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_EVENT_PATH are required.");
  }

  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  if (!shouldRouteCodexReviewRerunEvent(event)) {
    console.log("Codex Review rerun skipped: event is not trusted Codex evidence.");
    return;
  }

  const headSha = await resolveHeadSha({ token, repository, event });
  const result = await rerunCodexReviewForHead({ token, repository, headSha });
  console.log(result.message);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`Codex Review rerun failed: ${error.message}`);
    process.exit(1);
  }
}
