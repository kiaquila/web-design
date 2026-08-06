const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const CODEX_REVIEW_LOGIN = "chatgpt-codex-connector[bot]";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function isTrustedAssociation(value) {
  return TRUSTED_ASSOCIATIONS.has(String(value || "").toUpperCase());
}

export function isCodexReviewCommand(body) {
  return /(?:^|\s)@codex\s+review\b/i.test(String(body || ""));
}

export function isCodexReviewCommandForHead(body, headSha) {
  const requestedHead = String(body || "").match(
    /(?:^|\s)@codex\s+review\s+`?([a-f0-9]{40})`?\b/i
  )?.[1];
  return Boolean(requestedHead) && normalize(requestedHead) === normalize(headSha);
}

export function isTrustedCodexLogin(login) {
  return normalize(login) === CODEX_REVIEW_LOGIN;
}

export function createCodexReviewRequestMarkerBody({
  headSha,
  requestId,
  sourceCommentId,
  sourceCommentCreatedAt,
  requestedAt
}) {
  const recordedAt = requestedAt || new Date().toISOString();
  return [
    `Codex review request recorded for \`${String(headSha || "").slice(0, 10)}\`.`,
    "",
    "<!-- web-design:codex-review-request",
    `CODEX_REVIEW_REQUEST_ID: ${requestId}`,
    `CODEX_REVIEW_SHA: ${headSha}`,
    `CODEX_REVIEW_SOURCE_COMMENT_ID: ${sourceCommentId}`,
    `CODEX_REVIEW_SOURCE_COMMENT_CREATED_AT: ${sourceCommentCreatedAt || recordedAt}`,
    `CODEX_REVIEW_REQUESTED_AT: ${recordedAt}`,
    "-->"
  ].join("\n");
}

export function extractCodexReviewRequestMarker(body) {
  const text = String(body || "");
  if (!text.includes("web-design:codex-review-request")) return null;

  const field = (name) =>
    text.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, "im"))?.[1]?.trim() || null;
  const requestId = field("CODEX_REVIEW_REQUEST_ID");
  const sha = field("CODEX_REVIEW_SHA");
  const sourceCommentId = field("CODEX_REVIEW_SOURCE_COMMENT_ID");
  const sourceCommentCreatedAt = field("CODEX_REVIEW_SOURCE_COMMENT_CREATED_AT");
  const requestedAt = field("CODEX_REVIEW_REQUESTED_AT");

  if (!requestId || !sha || !sourceCommentId || !requestedAt) return null;
  if (!/^[a-f0-9]{7,40}$/i.test(sha)) return null;

  return {
    requestId,
    sha,
    sourceCommentId,
    sourceCommentCreatedAt,
    requestedAt
  };
}

export function latestCodexReviewRequestMarker(comments = [], headSha) {
  return comments
    .map((comment) => {
      const marker = extractCodexReviewRequestMarker(comment?.body);
      if (!marker) return null;
      return {
        ...marker,
        commentId: String(comment.id || ""),
        commentCreatedAt: comment.created_at || null,
        author: normalize(comment.user?.login)
      };
    })
    .filter((marker) =>
      marker && marker.author === "github-actions[bot]" && marker.sha === headSha
    )
    .sort((left, right) =>
      Date.parse(right.commentCreatedAt || right.requestedAt || "") -
      Date.parse(left.commentCreatedAt || left.requestedAt || "")
    )[0] || null;
}

export function latestTrustedCodexReviewCommand(comments = [], timeline = [], headSha) {
  return comments
    .filter((comment) =>
      comment?.user?.type !== "Bot" &&
      isTrustedAssociation(comment?.author_association) &&
      isCodexReviewCommandForHead(comment?.body, headSha)
    )
    .sort((left, right) =>
      Date.parse(right.created_at || "") - Date.parse(left.created_at || "")
    )
    .map((comment) => ({
      requestId: `bootstrap-${comment.id}-${String(headSha).slice(0, 12)}`,
      sha: headSha,
      sourceCommentId: String(comment.id || ""),
      sourceCommentCreatedAt: comment.created_at,
      requestedAt: comment.created_at,
      commentCreatedAt: comment.created_at,
      bootstrap: true
    }))[0] || null;
}

export function extractCodexPriority(body) {
  const match = String(body || "").match(/\bP([0-3])\b/i);
  return match ? Number(match[1]) : null;
}

export function containsBlockingCodexSeverity(body) {
  const priority = extractCodexPriority(body);
  return priority !== null && priority <= 2;
}

export function classifyCodexNativeReview(review, reviewComments = [], headSha) {
  if (!review || review.commit_id !== headSha) return null;
  if (!isTrustedCodexLogin(review.user?.login)) return null;
  if (containsBlockingCodexSeverity(review.body)) return "fail";
  if (review.state === "CHANGES_REQUESTED") return "fail";

  const commentsForReview = reviewComments.filter((comment) =>
    comment.pull_request_review_id === review.id &&
    isTrustedCodexLogin(comment.user?.login)
  );
  if (commentsForReview.length > 0) {
    const priorities = commentsForReview.map((comment) => extractCodexPriority(comment.body));
    if (priorities.some((priority) => priority === null)) return "fail";
    if (Math.min(...priorities) <= 2) return "fail";
  }

  return review.state === "APPROVED" || review.state === "COMMENTED" ? "pass" : null;
}

export function latestCodexNativeReviewResult(reviews = [], reviewComments = [], headSha) {
  return reviews
    .map((review) => ({
      review,
      result: classifyCodexNativeReview(review, reviewComments, headSha)
    }))
    .filter((entry) => entry.result !== null)
    .sort((left, right) =>
      Date.parse(right.review.submitted_at || "") -
      Date.parse(left.review.submitted_at || "")
    )[0]?.result || null;
}

export function isAcceptableCodexSummaryComment(comment, headSha) {
  const body = String(comment?.body || "").trim();
  if (!isTrustedCodexLogin(comment?.user?.login)) return false;
  if (!/^Codex Review:/i.test(body)) return false;
  if (!/did(?:\s+not|\s*n['’]?t)\s+find\s+any\s+major\s+issues/i.test(body)) return false;

  const shortSha = String(headSha || "").slice(0, 10);
  return Boolean(shortSha) && (body.includes(headSha) || body.includes(shortSha));
}
