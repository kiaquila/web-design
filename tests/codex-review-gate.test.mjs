import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyCodexNativeReview,
  createCodexReviewRequestMarkerBody,
  extractCodexReviewRequestMarker,
  hasHeadUpdateBetweenTimestamps,
  isAcceptableCodexSummaryComment,
  isCodexReviewCommand,
  isCodexReviewCommandForHead,
  isTrustedAssociation,
  latestCodexNativeReviewResult,
  latestCodexReviewRequestMarker,
  latestTrustedCodexReviewCommand
} from "../scripts/codex-review-helpers.mjs";
import {
  rerunCodexReviewForHead,
  selectCodexReviewRun,
  shouldRouteCodexReviewRerunEvent
} from "../scripts/codex-review-rerun.mjs";

const headSha = "abc123def456";
const codexUser = { login: "chatgpt-codex-connector[bot]" };

function markerBody() {
  return createCodexReviewRequestMarkerBody({
    headSha,
    requestId: "10-abc123def456",
    sourceCommentId: "10",
    sourceCommentCreatedAt: "2026-08-05T12:00:00Z",
    requestedAt: "2026-08-05T12:00:00Z"
  });
}

test("trusted request associations and the Codex command are explicit", () => {
  const commandHeadSha = "abcdef0123456789abcdef0123456789abcdef01";
  assert.equal(isTrustedAssociation("OWNER"), true);
  assert.equal(isTrustedAssociation("MEMBER"), true);
  assert.equal(isTrustedAssociation("COLLABORATOR"), true);
  assert.equal(isTrustedAssociation("CONTRIBUTOR"), false);
  assert.equal(isCodexReviewCommand("@codex review"), true);
  assert.equal(isCodexReviewCommand("please @CoDeX   review this"), true);
  assert.equal(isCodexReviewCommand("@codex implement"), false);
  assert.equal(isCodexReviewCommandForHead(`@codex review ${commandHeadSha}`, commandHeadSha), true);
  assert.equal(isCodexReviewCommandForHead(`@codex review ${commandHeadSha}`, "b".repeat(40)), false);
  assert.equal(isCodexReviewCommandForHead("@codex review", commandHeadSha), false);
});

test("request markers bind a GitHub Actions comment to the current head", () => {
  assert.deepEqual(extractCodexReviewRequestMarker(markerBody()), {
    requestId: "10-abc123def456",
    sha: headSha,
    sourceCommentId: "10",
    sourceCommentCreatedAt: "2026-08-05T12:00:00Z",
    requestedAt: "2026-08-05T12:00:00Z"
  });

  const trusted = {
    id: 11,
    body: markerBody(),
    created_at: "2026-08-05T12:00:01Z",
    user: { login: "github-actions[bot]" }
  };
  assert.equal(latestCodexReviewRequestMarker([trusted], headSha)?.requestId, "10-abc123def456");
  assert.equal(
    latestCodexReviewRequestMarker([{ ...trusted, user: { login: "repo-owner" } }], headSha),
    null,
    "a user-authored forged marker must not be accepted"
  );
  assert.equal(latestCodexReviewRequestMarker([trusted], "new-head"), null);
});

test("the installation PR can bind directly to a trusted request comment", () => {
  const installationHeadSha = "abcdef0123456789abcdef0123456789abcdef01";
  const command = {
    id: 12,
    body: `@codex review ${installationHeadSha}`,
    created_at: "2026-08-05T12:00:00Z",
    author_association: "OWNER",
    user: { login: "repo-owner", type: "User" }
  };
  assert.equal(
    latestTrustedCodexReviewCommand([command], [], installationHeadSha)?.bootstrap,
    true
  );
  assert.equal(
    latestTrustedCodexReviewCommand(
      [command],
      [{ event: "committed", created_at: "2026-08-05T12:01:00Z" }],
      "new-head"
    ),
    null,
    "a later head update changes the required command SHA"
  );
  assert.equal(
    latestTrustedCodexReviewCommand(
      [{ ...command, author_association: "CONTRIBUTOR" }],
      [],
      installationHeadSha
    ),
    null
  );
});

test("Codex summaries require the trusted bot and marker-bound timing", () => {
  const marker = {
    sha: headSha,
    sourceCommentCreatedAt: "2026-08-05T12:00:00Z",
    requestedAt: "2026-08-05T12:00:00Z"
  };
  const summary = {
    body: "Codex Review: Didn't find any major issues.",
    created_at: "2026-08-05T12:01:00Z",
    user: codexUser
  };

  assert.equal(isAcceptableCodexSummaryComment(summary, headSha, marker), true);
  assert.equal(
    isAcceptableCodexSummaryComment(
      { ...summary, created_at: "2026-08-05T11:59:59Z" },
      headSha,
      marker
    ),
    false
  );
  assert.equal(
    isAcceptableCodexSummaryComment(
      { ...summary, user: { login: "codex-fan" } },
      headSha,
      marker
    ),
    false
  );
  assert.equal(
    isAcceptableCodexSummaryComment(
      { ...summary, body: `Codex Review: Didn't find any major issues for ${headSha}.` },
      headSha,
      null
    ),
    true,
    "an explicit current SHA is independently head-bound"
  );
});

test("summary fallback is rejected when the head moved after the request", () => {
  const trigger = "2026-08-05T12:00:00Z";
  const summary = "2026-08-05T12:02:00Z";
  assert.equal(hasHeadUpdateBetweenTimestamps([], trigger, summary), false);
  assert.equal(hasHeadUpdateBetweenTimestamps([
    { event: "committed", created_at: "2026-08-05T12:01:00Z" }
  ], trigger, summary), true);
  assert.equal(hasHeadUpdateBetweenTimestamps([
    { event: "head_ref_force_pushed", created_at: "2026-08-05T12:01:00Z" }
  ], trigger, summary), true);
});

test("native Codex reviews are current-head and P0-P2 blocking", () => {
  const review = {
    id: 20,
    commit_id: headSha,
    state: "COMMENTED",
    submitted_at: "2026-08-05T12:01:00Z",
    user: codexUser
  };

  assert.equal(classifyCodexNativeReview(review, [], headSha), "pass");
  assert.equal(classifyCodexNativeReview(review, [{
    pull_request_review_id: 20,
    body: "![P3 Badge] Advisory note",
    user: codexUser
  }], headSha), "pass");
  assert.equal(classifyCodexNativeReview(review, [{
    pull_request_review_id: 20,
    body: "![P2 Badge] Blocking issue",
    user: codexUser
  }], headSha), "fail");
  assert.equal(classifyCodexNativeReview({
    ...review,
    state: "APPROVED"
  }, [{
    pull_request_review_id: 20,
    body: "![P2 Badge] Blocking issue",
    user: codexUser
  }], headSha), "fail", "approved reviews must still inspect inline findings");
  assert.equal(classifyCodexNativeReview(review, [{
    pull_request_review_id: 20,
    body: "Unclassified finding",
    user: codexUser
  }], headSha), "fail");
  assert.equal(classifyCodexNativeReview(review, [], "new-head"), null);
  assert.equal(
    classifyCodexNativeReview({ ...review, user: { login: "fake-codex[bot]" } }, [], headSha),
    null
  );
});

test("the latest current-head native Codex result wins", () => {
  const olderPass = {
    id: 1,
    commit_id: headSha,
    state: "COMMENTED",
    submitted_at: "2026-08-05T12:01:00Z",
    user: codexUser
  };
  const newerFail = {
    ...olderPass,
    id: 2,
    submitted_at: "2026-08-05T12:02:00Z"
  };
  assert.equal(latestCodexNativeReviewResult([olderPass, newerFail], [{
    pull_request_review_id: 2,
    body: "P1 regression",
    user: codexUser
  }], headSha), "fail");
});

test("rerun routing accepts only exact trusted Codex evidence", () => {
  assert.equal(shouldRouteCodexReviewRerunEvent({ review: { user: codexUser } }), true);
  assert.equal(
    shouldRouteCodexReviewRerunEvent({
      issue: { pull_request: {} },
      comment: { body: "Codex Review: Didn't find any major issues.", user: codexUser }
    }),
    true
  );
  assert.equal(
    shouldRouteCodexReviewRerunEvent({ review: { user: { login: "fake-codex[bot]" } } }),
    false
  );
});

test("rerun selection is head-bound and prefers active then failed runs", () => {
  const failed = {
    id: 30,
    event: "pull_request",
    head_sha: headSha,
    status: "completed",
    conclusion: "failure",
    created_at: "2026-08-05T12:00:00Z"
  };
  assert.deepEqual(selectCodexReviewRun([failed], headSha), { action: "rerun", run: failed });
  const succeeded = { ...failed, conclusion: "success" };
  assert.deepEqual(
    selectCodexReviewRun([succeeded], headSha),
    { action: "rerun", run: succeeded },
    "fresh trusted evidence must re-evaluate a previously successful gate run"
  );
  const active = {
    ...failed,
    id: 31,
    status: "in_progress",
    conclusion: null,
    created_at: "2026-08-05T12:01:00Z"
  };
  assert.deepEqual(
    selectCodexReviewRun([failed, active], headSha),
    { action: "already_running", run: active }
  );
  assert.deepEqual(selectCodexReviewRun([failed], "new-head"), {
    action: "not_found",
    run: null
  });
});

test("rerun helper calls the Actions endpoint for a failed head-bound run", async () => {
  const calls = [];
  const request = async (_token, _repository, path, options = {}) => {
    calls.push({ path, method: options.method || "GET" });
    if (path.includes("/actions/workflows/codex-review.yml/runs")) {
      return {
        workflow_runs: [{
          id: 42,
          event: "pull_request",
          head_sha: headSha,
          status: "completed",
          conclusion: "failure",
          created_at: "2026-08-05T12:00:00Z"
        }]
      };
    }
    return null;
  };

  const result = await rerunCodexReviewForHead({
    token: "token",
    repository: "owner/repo",
    headSha,
    request
  });
  assert.equal(result.action, "rerun");
  assert.deepEqual(calls, [
    {
      path: `/repos/owner/repo/actions/workflows/codex-review.yml/runs?event=pull_request&head_sha=${headSha}&per_page=100`,
      method: "GET"
    },
    { path: "/repos/owner/repo/actions/runs/42/rerun", method: "POST" }
  ]);
});
