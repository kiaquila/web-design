#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const requirePolicyDependency = createRequire(
  new URL("../.web-design/policy/package.json", import.meta.url)
);
const policyNodeModules = resolve(
  fileURLToPath(new URL("../.web-design/policy/node_modules", import.meta.url))
);
const yamlEntry = resolve(requirePolicyDependency.resolve("yaml"));
if (!yamlEntry.startsWith(`${policyNodeModules}${sep}`)) {
  throw new Error("Managed policy dependency yaml is not installed under .web-design/policy");
}
const { isAlias, isMap, isScalar, isSeq, parseDocument } = requirePolicyDependency(yamlEntry);

const REQUIRED_ROOT_FILES = [
  ".gitignore",
  ".github/CODEOWNERS",
  ".web-design/project.json",
  ".web-design/lock.json",
  ".web-design/managed-files.json",
  ".web-design/release-manifest.json",
  ".github/pull_request_template.md",
  ".github/workflows/baseline-source-verification.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/repository-guard.yml",
  ".github/workflows/osv-scan.yml",
  ".github/workflows/web-design-update.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs/standards/content-and-design.md",
  "docs/standards/deployment.md",
  "docs/standards/git-and-reviews.md",
  "docs/standards/project-structure.md",
  "docs/standards/security.md",
  "docs/standards/testing.md",
  "docs/operations/bootstrap.md",
  "docs/operations/github-setup.md",
  "docs/operations/updates.md",
  ".web-design/policy/package-lock.json",
  ".web-design/policy/package.json",
  "scripts/check-managed-files.mjs",
  "scripts/check-baseline-change.mjs",
  "scripts/check-repository.mjs",
  "scripts/build-release-manifest.mjs",
  "scripts/run-project-checks.mjs",
  "scripts/sync-project.mjs",
  "scripts/test-web-design.mjs"
];

const FORBIDDEN_SEGMENTS = new Set([
  ".next",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules"
]);
const FORBIDDEN_NAMES = [
  /^\.DS_Store$/,
  /^\.env(?:\..+)?$/,
  /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
  /\.(?:key|p12|pfx|pem|session)$/i
];
const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["OpenAI-style API key", /sk-[A-Za-z0-9_-]{32,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Telegram bot token", /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/]
];
const PERSONAL_PATH_PATTERNS = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/
];

// Validating free-form shell here is a losing game: every round of review found
// another construct that runs the check but discards its verdict — a trailing
// `; true`, a `|| true`, a `| tee`, a comment, a nested `sh -c`, a line
// continuation. Rather than keep enumerating them, a product check is
// constrained to a shape whose exit status provably comes from a real command.
//
// A check is one line of simple commands joined only by `&&`. That operator is
// the one separator that propagates failure: `A && B` fails when A fails and
// reports B otherwise. `;`, `||`, `|`, and `&` each let an earlier failure be
// discarded, and command substitution, redirection, and expansion can reach
// around the rule entirely. Anything that needs them belongs in a script file
// the project runs, where the code is reviewed rather than quoted.
// Listing the no-ops was the same losing game one level down: `true`, then
// `:`, then `/bin/true`, then `sleep 0`. A shell has an unbounded supply of
// commands that exit zero without touching the product, so the check names the
// small class that can run a project's own code instead — a package manager, a
// language runtime, a build driver, or a shell handed a script file (with
// `-c` refused as a nested shell above). Anything else belongs behind a script
// the project runs, where the code is reviewed rather than quoted.
// A target is a subcommand that runs the project's own code, or a file for the
// tool to run. `--version` and `version` are neither, which is what separates
// `npm --version` from `npm test`.
const PRODUCT_CHECK_VERB = new Set([
  "run", "test", "tests", "check", "checks", "ci", "install", "build", "lint",
  "format", "fmt", "typecheck", "vet", "verify", "e2e", "audit", "coverage",
  "bench", "exec", "start", "all"
]);

function isProductCheckTarget(word) {
  const bare = word.replace(/^["']|["']$/g, "");
  if (!bare || bare.startsWith("-")) return false;
  if (PRODUCT_CHECK_VERB.has(bare)) return true;
  return bare.includes("/") || /\.[A-Za-z0-9]+$/.test(bare);
}

const PRODUCT_CHECK_EXECUTABLE = new Set([
  "npm", "npx", "pnpm", "pnpx", "yarn", "bun", "bunx",
  "node", "deno", "python", "python3", "ruby", "php", "java", "swift",
  "go", "cargo", "dotnet", "make", "mvn", "gradle", "./gradlew", "gradlew",
  "pytest", "tox", "rake", "bundle", "composer", "poetry", "uv", "pipenv",
  "bash", "sh", "zsh"
]);
const SHELL_CONTROL_CHARACTERS = /[;|&`<>(){}$\\]/;
// `! npm test` succeeds precisely when the product tests fail.
const SHELL_NEGATION = /(?:^|[\s;&|(])!(?:\s|$)/;

function splitOutsideQuotes(command) {
  const segments = [];
  let current = "";
  let quote = null;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === "&" && command[index + 1] === "&") {
      segments.push(current);
      current = "";
      index += 1;
      continue;
    }
    current += character;
  }
  if (quote) return null;
  segments.push(current);
  return segments;
}

function outsideQuotes(command) {
  let bare = "";
  let quote = null;
  for (const character of command) {
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    bare += character;
  }
  return bare;
}

// The structural rule above bans the shell operators, which leaves one way to
// reach a second round of parsing: hand the text to another shell. Tokens are
// compared rather than pattern-matched so a wrapper (`env sh -c`), a path
// (`/bin/sh -c`), and combined flags (`sh -ec`) are all caught.
const SHELL_NAMES = new Set(["sh", "bash", "zsh", "dash", "ksh", "csh", "tcsh", "fish"]);

function executesNestedShell(bareSegment) {
  const tokens = bareSegment.split(/\s+/).filter(Boolean);
  for (const [index, token] of tokens.entries()) {
    if (token === "eval") return true;
    const name = token.slice(token.lastIndexOf("/") + 1);
    if (!SHELL_NAMES.has(name)) continue;
    for (const flag of tokens.slice(index + 1)) {
      if (/^-[A-Za-z]*c[A-Za-z]*$/.test(flag)) return true;
    }
  }
  return false;
}

// `command true`, `env -u FOO true`, `stdbuf -o L true` — each wrapper has its
// own option grammar, and getting one wrong lets the word that decides the exit
// status hide behind it. Rather than learn every grammar, a product check may
// not be wrapped at all: the first word is the command whose status counts.
const COMMAND_WRAPPERS = new Set([
  "command", "env", "exec", "nice", "ionice", "nohup", "stdbuf", "time", "timeout",
  "xargs", "setsid", "chrt", "taskset", "unbuffer", "script", "sudo", "doas", "su"
]);

// `FOO=bar true` runs `true`: leading assignments are environment, not the
// command, so the executable is the first word that is not one.
// `FOO='a b' true` is one assignment and then `true`. Splitting on whitespace
// after the quotes are gone would see `FOO=a`, `b`, `true` and call `b` the
// command, so words are cut on unquoted whitespace and unquoted afterwards.
function wordsRespectingQuotes(segment) {
  const words = [];
  let current = "";
  let quote = null;
  let started = false;
  for (const character of segment) {
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      started = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (started) words.push(current);
      current = "";
      started = false;
      continue;
    }
    current += character;
    started = true;
  }
  if (started) words.push(current);
  return words;
}

function commandWordsAfterAssignments(segment) {
  const words = wordsRespectingQuotes(segment);
  let index = 0;
  while (index < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[index])) index += 1;
  return words.slice(index);
}

function executableBasename(word) {
  return word.slice(word.lastIndexOf("/") + 1);
}

function wrapsTheProductCommand(command) {
  const first = commandWordsAfterAssignments(command)[0];
  if (!first) return false;
  return COMMAND_WRAPPERS.has(executableBasename(first));
}

// Single quotes suppress every expansion; double quotes do not, so a command
// substitution can hide inside them and decide the command word at runtime.
function hasExpansionOutsideSingleQuotes(segment) {
  let quote = null;
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index];
    if (quote === "'") {
      if (character === "'") quote = null;
      continue;
    }
    if (character === "'" && quote === null) {
      quote = "'";
      continue;
    }
    if (character === '"') {
      quote = quote === '"' ? null : '"';
      continue;
    }
    if (character === "$" || character === "`" || character === "\\") return true;
  }
  return false;
}

// With expansions refused, quotes are pure grouping, so removing the quote
// characters (keeping their content) yields the words the shell would run.
function withoutQuoteCharacters(segment) {
  let bare = "";
  let quote = null;
  for (const character of segment) {
    if (quote) {
      if (character === quote) quote = null;
      else bare += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    bare += character;
  }
  return bare;
}

export function validateProductCheckCommand(command) {
  if (/[\n\r]/.test(command)) return "must be a single line";
  const segments = splitOutsideQuotes(command);
  if (segments === null) return "must not leave a quote unclosed";
  for (const segment of segments) {
    const trimmed = segment.trim().replace(/\s+/g, " ");
    if (!trimmed) return "must not contain an empty command";
    const bare = outsideQuotes(trimmed);
    if (SHELL_CONTROL_CHARACTERS.test(bare)) {
      return "must join commands only with && and use no other shell operators";
    }
    if (SHELL_NEGATION.test(bare)) {
      return "must not invert a command's exit status";
    }
    if (hasExpansionOutsideSingleQuotes(trimmed)) {
      return "must not expand anything outside single quotes";
    }
    if (bare.includes("#")) return "must not contain a shell comment";
    const unquoted = withoutQuoteCharacters(trimmed).trim().replace(/\s+/g, " ");
    if (executesNestedShell(unquoted)) {
      return "must not hand shell text to another shell";
    }
    if (wrapsTheProductCommand(trimmed)) {
      return "must not wrap the product command; the first word decides the exit status";
    }
    const words = commandWordsAfterAssignments(trimmed);
    if (!words.length) return "must execute a real product check";
    if (!PRODUCT_CHECK_EXECUTABLE.has(executableBasename(words[0]))) {
      return "must execute a real product check";
    }
    // `npm --version` clears the executable allowlist and still runs no
    // project code, and so do `node -v` and `go version`. The executable only
    // says which tool runs; what it is pointed at is what makes the check
    // real, so the command also has to carry a target — a subcommand that
    // runs project code, or a file to run. An unusual verb is not a dead end:
    // point the check at a script and the file itself is the target.
    if (!words.slice(1).some(isProductCheckTarget)) {
      return "must execute a real product check";
    }
  }
  return null;
}

function parseRoot(argv = process.argv.slice(2)) {
  const index = argv.indexOf("--root");
  if (index === -1) return resolve(import.meta.dirname, "..");
  if (!argv[index + 1]) throw new Error("--root requires a path");
  return resolve(argv[index + 1]);
}

function repositoryFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" }
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git ls-files failed");
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter((file) => !file.startsWith(".guard-trusted/"));
}

function looksBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

export function validateProjectConfig(config, profiles = []) {
  const failures = [];
  const availableProfiles = Array.isArray(profiles) ? profiles : Object.keys(profiles);
  if (config?.schemaVersion !== 1) failures.push("project.json schemaVersion must be 1");
  const slug = config?.project?.slug;
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    failures.push("project.slug must be lower-case kebab-case");
  }
  const profile = config?.project?.profile;
  if (typeof profile !== "string" || !availableProfiles.includes(profile)) {
    failures.push(`project.profile must name an installed profile: ${JSON.stringify(profile)}`);
  }
  const productPaths = config?.project?.productPaths;
  if (!Array.isArray(productPaths)) {
    failures.push("project.productPaths must be an array");
  } else {
    for (const path of productPaths) {
      const normalized = typeof path === "string" ? normalize(path) : "";
      if (!normalized || isAbsolute(normalized) || normalized === ".." || normalized.startsWith(`..${sep}`)) {
        failures.push(`Unsafe product path: ${JSON.stringify(path)}`);
      }
    }
  }
  if (!Array.isArray(config?.commands?.check)) {
    failures.push("commands.check must be an array");
  } else if (config?.governance?.mode === "consumer" && config.commands.check.length === 0) {
    failures.push("consumer projects must configure at least one product check");
  } else {
    for (const [index, check] of config.commands.check.entries()) {
      if (!check || typeof check !== "object" || Array.isArray(check)) {
        failures.push(`commands.check[${index}] must be an object`);
        continue;
      }
      if (typeof check.name !== "string" || !check.name.trim()) {
        failures.push(`commands.check[${index}].name must be a non-empty string`);
      }
      if (typeof check.run !== "string" || !check.run.trim()) {
        failures.push(`commands.check[${index}].run must be a non-empty string`);
        continue;
      }
      const problem = validateProductCheckCommand(check.run);
      if (problem) failures.push(`commands.check[${index}].run ${problem}`);
    }
  }
  const rootDirectory = config?.deployment?.rootDirectory;
  const normalizedRoot = typeof rootDirectory === "string" ? normalize(rootDirectory) : "";
  if (
    !normalizedRoot ||
    isAbsolute(normalizedRoot) ||
    normalizedRoot === ".." ||
    normalizedRoot.startsWith(`..${sep}`)
  ) {
    failures.push("deployment.rootDirectory must stay inside the repository");
  }
  if (config?.deployment?.productionBranch !== "main") {
    failures.push("deployment.productionBranch must be main");
  }
  const profileData = Array.isArray(profiles) ? null : profiles[profile];
  if (profileData && config?.deployment?.provider !== profileData.deploymentProvider) {
    failures.push(`deployment.provider must match profile ${profile}`);
  }
  if (config?.governance?.source !== "kiaquila/web-design") {
    failures.push("governance.source must be kiaquila/web-design");
  }
  if (!new Set(["source", "consumer"]).has(config?.governance?.mode)) {
    failures.push("governance.mode must be source or consumer");
  }
  return failures;
}

function mapPair(map, key) {
  if (!isMap(map)) return null;
  return map.items.find((pair) => isScalar(pair.key) && pair.key.value === key) ?? null;
}

function unsupportedSecurityConstructs(node, kinds = new Set()) {
  if (!node) return kinds;
  if (isAlias(node)) {
    kinds.add("alias");
    return kinds;
  }
  if (node.anchor) kinds.add("anchor");
  if (node.tag) kinds.add("tag");
  if (isScalar(node) && new Set(["BLOCK_FOLDED", "BLOCK_LITERAL"]).has(node.type)) {
    kinds.add("block scalar");
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      if (isScalar(pair.key) && pair.key.value === "<<") kinds.add("merge key");
      unsupportedSecurityConstructs(pair.key, kinds);
      unsupportedSecurityConstructs(pair.value, kinds);
    }
  } else if (isSeq(node)) {
    for (const item of node.items) unsupportedSecurityConstructs(item, kinds);
  }
  return kinds;
}

function unsupportedJobTreeConstructs(node, kinds = new Set()) {
  if (!node) return kinds;
  if (isAlias(node)) {
    kinds.add("alias");
    return kinds;
  }
  if (node.anchor) kinds.add("anchor");
  if (node.tag) kinds.add("tag");
  if (isMap(node)) {
    for (const pair of node.items) {
      if (isScalar(pair.key) && pair.key.value === "<<") kinds.add("merge key");
      unsupportedJobTreeConstructs(pair.key, kinds);
      unsupportedJobTreeConstructs(pair.value, kinds);
    }
  } else if (isSeq(node)) {
    for (const item of node.items) unsupportedJobTreeConstructs(item, kinds);
  }
  return kinds;
}

function workflowEvents(node, failures, path) {
  const events = new Set();
  for (const kind of unsupportedSecurityConstructs(node)) {
    failures.push(`Workflow trigger uses unsupported YAML ${kind}: ${path}`);
  }
  if (isScalar(node) && typeof node.value === "string") {
    events.add(node.value);
  } else if (isSeq(node)) {
    for (const item of node.items) {
      if (!isScalar(item) || typeof item.value !== "string") {
        failures.push(`Workflow trigger list must contain event names: ${path}`);
        continue;
      }
      events.add(item.value);
    }
  } else if (isMap(node)) {
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
        failures.push(`Workflow trigger map must use event-name keys: ${path}`);
        continue;
      }
      events.add(pair.key.value);
    }
  } else {
    failures.push(`Workflow trigger must be a scalar, sequence, or mapping: ${path}`);
  }
  return events;
}

function permissionWrites(node, scope, failures, path) {
  for (const kind of unsupportedSecurityConstructs(node)) {
    failures.push(`Workflow ${scope} use unsupported YAML ${kind}: ${path}`);
  }
  if (isScalar(node)) {
    if (!new Set(["read-all", "write-all"]).has(node.value)) {
      failures.push(`Workflow ${scope} must be read-all, write-all, or a permission map: ${path}`);
    }
    return node.value === "write-all";
  }
  if (!isMap(node)) {
    failures.push(`Workflow ${scope} must be a permission map: ${path}`);
    return true;
  }
  let writes = false;
  for (const pair of node.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
      failures.push(`Workflow ${scope} must use scalar permission keys: ${path}`);
      writes = true;
      continue;
    }
    if (!isScalar(pair.value) || !new Set(["read", "write", "none"]).has(pair.value.value)) {
      failures.push(`Workflow ${scope} has an invalid level for ${pair.key.value}: ${path}`);
      writes = true;
      continue;
    }
    if (pair.value.value === "write") writes = true;
  }
  return writes;
}

// GitHub takes the workflow file from a ref the actor chooses for these events,
// so a write-capable job reachable from one of them can run unreviewed code with
// a write token. Every other event runs the default branch's copy of the file.
const REF_SELECTABLE_EVENTS = new Set([
  "create",
  "delete",
  "merge_group",
  "pull_request",
  "pull_request_target",
  "push",
  "release",
  "workflow_call",
  "workflow_dispatch"
]);

// A push filtered to the default branch runs the default branch's own copy of
// the workflow, which is the reviewed, trusted context the security standard
// allows write jobs to run from. Every managed workflow already writes the
// default branch as `main`; a tag filter or a wider branch list is not trusted.
const DEFAULT_BRANCH_REF_NAMES = new Set(["main"]);
const PUSH_FILTER_KEYS_WITHOUT_REF_WIDENING = new Set(["paths", "paths-ignore"]);

function pushRestrictedToDefaultBranch(node) {
  if (!isMap(node)) return false;
  const push = node.items.find((pair) => isScalar(pair.key) && pair.key.value === "push");
  if (!push || !isMap(push.value)) return false;
  let branches = null;
  for (const pair of push.value.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") return false;
    if (pair.key.value === "branches") {
      branches = pair.value;
      continue;
    }
    if (!PUSH_FILTER_KEYS_WITHOUT_REF_WIDENING.has(pair.key.value)) return false;
  }
  if (!isSeq(branches) || branches.items.length === 0) return false;
  return branches.items.every(
    (item) => isScalar(item) && DEFAULT_BRANCH_REF_NAMES.has(item.value)
  );
}

// A trusted event still runs with whatever ref a checkout step asks for. If a
// write-capable job checks proposed code out over the workspace, the next step
// that builds or tests runs that code with the write token. Blocklisting known
// untrusted expressions is not enough — `github.event.comment.body` is supplied
// by whoever commented — so only refs that are provably the trusted branch are
// allowed. Anything else must be isolated under its own `path`, and
// `docs/standards/security.md` carries the rule that such a tree is never
// executed.
const TRUSTED_CHECKOUT_REFS = [
  /^\$\{\{\s*github\.event\.repository\.default_branch\s*\}\}$/,
  /^\$\{\{\s*github\.sha\s*\}\}$/,
  /^\$\{\{\s*github\.ref\s*\}\}$/,
  /^\$\{\{\s*github\.ref_name\s*\}\}$/,
  /^main$/,
  /^refs\/heads\/main$/
];

// `path: .`, `path: ./`, and `path: ../..` all land back on the workspace, so an
// isolated checkout has to be a literal relative subdirectory.
function isolatedCheckoutDirectory(node) {
  if (!isScalar(node) || typeof node.value !== "string") return null;
  const requested = node.value.trim();
  if (!requested || requested.includes("${{")) return null;
  if (requested.startsWith("/") || /^[A-Za-z]:/.test(requested)) return null;
  const segments = requested.split(/[\\/]+/).filter(Boolean);
  if (!segments.length) return null;
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return segments.join("/");
}

// `repository:` retargets the checkout: any other repository's tree replaces
// the workspace even when `ref` is absent, because Checkout then takes that
// repository's default branch. Only `${{ github.repository }}` is provably
// this repository — a literal owner/name cannot be verified statically in a
// template shared across consumers, so it fails closed as untrusted.
function checkoutTargetsCurrentRepository(withNode) {
  const repository = mapPair(withNode, "repository")?.value;
  if (repository === undefined) return true;
  if (!isScalar(repository) || typeof repository.value !== "string") return false;
  return /^\$\{\{\s*github\.repository\s*\}\}$/.test(repository.value.trim());
}

function untrustedCheckoutDirectory(step) {
  const uses = mapPair(step, "uses");
  if (!isScalar(uses?.value) || typeof uses.value.value !== "string") return undefined;
  if (!/^actions\/checkout@/.test(uses.value.value)) return undefined;
  const withNode = mapPair(step, "with")?.value;
  if (!isMap(withNode)) return undefined;
  const ref = mapPair(withNode, "ref")?.value;
  if (checkoutTargetsCurrentRepository(withNode)) {
    if (!ref) return undefined;
    if (isScalar(ref) && typeof ref.value === "string") {
      const requested = ref.value.trim();
      if (TRUSTED_CHECKOUT_REFS.some((pattern) => pattern.test(requested))) return undefined;
    }
  }
  return isolatedCheckoutDirectory(mapPair(withNode, "path")?.value);
}

// Isolating the tree keeps it inspectable as data; it stops being data the
// moment a step runs something out of it. Passing the directory as an argument
// to a trusted program is still fine, which is what the baseline's own
// verification workflow does.
function normalizedRelativeSegments(value) {
  if (typeof value !== "string") return null;
  const requested = value.trim();
  if (!requested || requested.includes("${{")) return null;
  if (requested.startsWith("/") || /^[A-Za-z]:/.test(requested)) return null;
  // `candidate/sub/..` resolves back into `candidate`, so `..` is applied
  // rather than treated as unknown. Escaping above the workspace is unknown.
  const resolved = [];
  for (const segment of requested.split(/[\\/]+/)) {
    if (!segment || segment === ".") continue;
    if (segment !== "..") {
      resolved.push(segment);
      continue;
    }
    if (!resolved.length) return null;
    resolved.pop();
  }
  return resolved;
}

function pathEntersUntrustedTree(value, directory) {
  const segments = normalizedRelativeSegments(value);
  if (segments === null) return false;
  const target = directory.split("/");
  if (segments.length < target.length) return false;
  return target.every((segment, index) => segments[index] === segment);
}

function directoryEntersUntrustedTree(node, directory) {
  if (!isScalar(node) || typeof node.value !== "string") return false;
  return pathEntersUntrustedTree(node.value, directory);
}

// Enumerating the commands that can fetch proposed code was a losing game:
// `git fetch`, then `git pull`, then past Git's global options, then a line
// continuation, then `gh pr checkout`. The command surface is open-ended, so
// the rule is about inputs instead. A write-capable job's shell may not name
// an actor-controlled ref at all — not the expressions that carry one, not a
// pull ref, not `FETCH_HEAD`, not the CLI that resolves one for you. Trusted
// refs stay available, and anything that genuinely needs proposed code belongs
// in a read-only job that hands its findings on.
// Some inputs are acquisition on their own: a pull ref, `FETCH_HEAD`, or the
// `gh pr` subcommands exist only to obtain proposed code.
const ALWAYS_UNTRUSTED_REF_INPUT = [
  /\brefs\/pull\//,
  /[\s'"=]pull\/[^\s'"]*\/(?:head|merge)\b/i,
  /\bFETCH_HEAD\b/,
  /\bgh\s+pr\s+(?:checkout|diff|view)\b/
];

// An actor-controlled expression is not dangerous by itself — the baseline's own
// verification workflow compares `workflow_run.head_sha` as data and never
// fetches with it. It becomes dangerous when the same shell can also acquire
// code, so the expression is refused only alongside a tool that can.
const ACTOR_CONTROLLED_REF_EXPRESSION =
  /\$\{\{[^}]*(?:github\.event\.(?:issue|comment|pull_request|client_payload|workflow_run)|github\.head_ref)\b/;
const REF_ACQUIRING_TOOL = /(?:^|[\s;&|(])(?:[^\s;&|(]*\/)?(?:git(?:\s|$)|gh\s+repo\s+clone\b)/;

// A backslash-newline is a line continuation: the shell sees one command, so
// the scan must too.
function joinShellContinuations(text) {
  return text.replace(/\\\r?\n[ \t]*/g, " ");
}

function alwaysUntrustedInput(text) {
  const joined = joinShellContinuations(text);
  return ALWAYS_UNTRUSTED_REF_INPUT.some((pattern) => pattern.test(joined));
}

function environmentRefExpression(node) {
  const env = mapPair(node, "env")?.value;
  if (!isMap(env)) return false;
  return env.items.some((pair) => {
    if (!isScalar(pair.value) || typeof pair.value.value !== "string") return false;
    return (
      ACTOR_CONTROLLED_REF_EXPRESSION.test(pair.value.value) ||
      alwaysUntrustedInput(pair.value.value)
    );
  });
}

function stepNamesActorControlledRef(step, refExpressionInScope) {
  const run = mapPair(step, "run")?.value;
  const hasRun = isScalar(run) && typeof run.value === "string";
  const stepEnvExpression = environmentRefExpression(step);
  if (hasRun && alwaysUntrustedInput(run.value)) return true;
  if (!hasRun) return false;
  const text = joinShellContinuations(run.value);
  const expressionAvailable =
    refExpressionInScope || stepEnvExpression || ACTOR_CONTROLLED_REF_EXPRESSION.test(text);
  return expressionAvailable && REF_ACQUIRING_TOOL.test(text);
}

function changeDirectoryDestinations(text) {
  const destinations = [];
  const pattern = /(?:^|[\s;&|(])(?:cd|pushd)((?:\s+(?:--|-[A-Za-z]+))*)\s+("[^"]*"|'[^']*'|[^\s;&|)]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    destinations.push(match[2].replace(/^["']|["']$/g, ""));
  }
  return destinations;
}

// `target=candidate; cd "$target"` resolves at run time. With an untrusted
// checkout present there is no safe reading of a computed destination.
function hasComputedChangeDirectory(text) {
  // Enumerating shell metacharacters kept missing expansions (`cand{i..i}date`
  // slipped past a `$`/backtick/glob denylist), so only destinations made of
  // plain literal path characters are readable; anything else — variables,
  // backticks, globs, braces, tildes, escapes, or `cd -` — resolves at run time.
  return changeDirectoryDestinations(text).some(
    (destination) => destination === "-" || !/^[A-Za-z0-9._/-]+$/.test(destination)
  );
}

// `working-directory: ${{ 'candidate' }}` resolves at run time, so no static
// comparison can clear it. A write-capable job with an isolated untrusted
// checkout may not have a computed working directory at all.
function stepHasComputedWorkingDirectory(step) {
  const hasRun = isScalar(mapPair(step, "run")?.value);
  if (!hasRun) return false;
  const workingDirectory = mapPair(step, "working-directory")?.value;
  if (!workingDirectory) return false;
  if (!isScalar(workingDirectory) || typeof workingDirectory.value !== "string") return true;
  return workingDirectory.value.includes("${{");
}

// `actions/github-script` with `script: await import(...'/candidate/x.mjs')`
// executes the isolated tree without a `run:` block, and nothing structural
// separates an action that evaluates its inputs from one that does not: inputs
// are opaque, and scanning them would be reading a language again. So beside
// an untrusted checkout a write-capable job may reach for only the published
// actions that stand this tree up — checkout and the pinned runtime, whose
// handling of inputs the baseline vouches for. A job needing another published
// action does not belong beside proposed code; `docs/standards/security.md`
// keeps that work in a read-only job that hands its findings on. A local
// action is this repository's own code under the same CODEOWNERS boundary as
// the scripts a `run:` step calls, so it stays available — one that reaches
// into the tree is refused as execution, above.
const TREE_ADJACENT_ACTION = /^actions\/(?:checkout|setup-node)@[0-9a-f]{40}$/;

function stepUsesUnvouchedAction(step) {
  const uses = mapPair(step, "uses")?.value;
  if (!uses) return false;
  if (!isScalar(uses) || typeof uses.value !== "string") return true;
  const reference = uses.value.trim();
  if (reference.startsWith("./")) return false;
  return !TREE_ADJACENT_ACTION.test(reference);
}

function stepExecutesFromDirectory(step, directory, jobDefaultsEnterTree) {
  const uses = mapPair(step, "uses")?.value;
  if (isScalar(uses) && typeof uses.value === "string") {
    const reference = uses.value.trim();
    if (reference.startsWith("./") && pathEntersUntrustedTree(reference.slice(2), directory)) {
      return true;
    }
  }
  const workingDirectory = mapPair(step, "working-directory")?.value;
  const hasRun = isScalar(mapPair(step, "run")?.value);
  if (hasRun && workingDirectory && directoryEntersUntrustedTree(workingDirectory, directory)) {
    return true;
  }
  if (hasRun && !workingDirectory && jobDefaultsEnterTree) return true;
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  const text = joinShellContinuations(run.value);
  // `cd website/../candidate` resolves into the tree, so destinations are
  // normalized rather than matched literally.
  if (changeDirectoryDestinations(text).some((d) => pathEntersUntrustedTree(d, directory))) {
    return true;
  }
  if (hasComputedChangeDirectory(text)) return true;
  const quoted = directory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const interpreters = "node|bash|sh|zsh|dash|python3?|npx|deno|ruby|perl|go|make";
  return (
    new RegExp(`(?:^|[\\s;&|(])(?:[^\\s;&|(]*/)?${quoted}/`, "m").test(text) ||
    new RegExp(`(?:^|[\\s;&|(])(?:${interpreters})\\s+\\S*${quoted}/`, "m").test(text) ||
    new RegExp(`--prefix\\s+\\S*${quoted}(?:\\s|$|["'])`, "m").test(text)
  );
}

// `PATH="$PWD/candidate:$PATH" evil` executes the checkout's `evil` without
// the directory ever being followed by a slash, and `NODE_PATH`, `PYTHONPATH`,
// `LD_PRELOAD`, or `BASH_ENV` reach the same place — enumerating search-path
// variables is a denylist. So no environment value, shell assignment or YAML
// `env:`, may name the untrusted tree at all; the directory stays passable as
// a program argument to a trusted tool. Assignment values are read quote-aware
// with backslashes applied, so `X="a b/candidate"` and `X=cand\idate` cannot
// hide the name, while `X='cand\idate'` stays the literal it is.
function shellAssignmentValues(text) {
  const values = [];
  const starts = /(?:^|[\s;&|(])[A-Za-z_][A-Za-z0-9_]*=/g;
  let match;
  while ((match = starts.exec(text)) !== null) {
    const valueStart = starts.lastIndex;
    let index = starts.lastIndex;
    let quote = null;
    let value = "";
    while (index < text.length) {
      const character = text[index];
      if (quote === "'") {
        if (character === "'") quote = null;
        else value += character;
      } else if (quote === '"') {
        if (character === '"') quote = null;
        else if (character === "\\") {
          index += 1;
          if (index < text.length) value += text[index];
        } else value += character;
      } else if (character === "'") {
        quote = "'";
      } else if (character === '"') {
        quote = '"';
      } else if (character === "\\") {
        index += 1;
        if (index < text.length) value += text[index];
      } else if (/[\s;&|)]/.test(character)) {
        break;
      } else {
        value += character;
      }
      index += 1;
    }
    values.push({ value, raw: text.slice(valueStart, index) });
    starts.lastIndex = index;
  }
  return values;
}

function valueNamesTree(value, directory) {
  const quoted = directory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[=:/'"\\s])${quoted}(?:[=:/'"\\s]|$)`).test(value);
}

function environmentSeedsTree(node, directory) {
  const env = mapPair(node, "env")?.value;
  if (!isMap(env)) return false;
  return env.items.some(
    (pair) =>
      isScalar(pair.value) &&
      typeof pair.value.value === "string" &&
      valueNamesTree(pair.value.value, directory)
  );
}

function stepSeedsEnvironmentWithTree(step, directory) {
  if (environmentSeedsTree(step, directory)) return true;
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  const text = joinShellContinuations(run.value);
  return shellAssignmentValues(text).some(({ value }) => valueNamesTree(value, directory));
}

// `y=cand && x="$y"idate` assembles the tree name without ever writing it, and
// `name=GITHUB_""OUTPUT` does the same to an environment-file name, so beside
// an untrusted checkout a shell assignment may only be a whole literal or a
// whole-value copy of one other variable: `code=$?`, `head_sha="$HEAD_SHA"`,
// and `-f name=baseline-source-verification` stay expressible, while any
// splice — quotes closing mid-value, concatenation, command substitution,
// arithmetic — fails closed. The raw text decides, because quote stripping
// would make `"$y"idate` look like the single variable `$yidate`.
const WHOLE_VALUE_EXPANSION = /^"?\$(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\}|[?$!#*@0-9])"?$/;
const WHOLE_LITERAL_VALUE = [/^[^'"$`]*$/, /^'[^']*'$/, /^"[^"'$`]*"$/];

function stepAssemblesShellValue(step) {
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  const text = joinShellContinuations(run.value);
  return shellAssignmentValues(text).some(
    ({ raw }) =>
      !WHOLE_VALUE_EXPANSION.test(raw) && !WHOLE_LITERAL_VALUE.some((form) => form.test(raw))
  );
}

// `./cand''idate/evil` executes the tree without the scan ever seeing its
// name: the empty quoted fragment splices one word out of two, and an escape,
// a glob, or `./cand{i..i}date/evil` does the same. Naming the constructs that
// expand has now missed globs once and braces twice, so an unquoted word is
// read by allowlist instead — only characters that cannot expand, plus the
// operator words a command list is built from. A quoted word is whole or it is
// nothing, and a `NAME=` prefix is stripped first because the assignment rule
// already constrains what follows it.
const READABLE_UNQUOTED_WORD = /^[A-Za-z0-9._/=:,+@%^-]*$/;
const SHELL_OPERATOR_WORD = new Set(["&&", "||", "|", ";", "&", ">", ">>", "<", "[", "]"]);
const WHOLE_WORD_FRAGMENT = [READABLE_UNQUOTED_WORD, /^'[^']*'$/, /^"[^"\\]*"$/];

function shellWords(text) {
  const words = [];
  let current = "";
  let quote = null;
  let started = false;
  for (const character of text) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      started = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (started) words.push(current);
      current = "";
      started = false;
      continue;
    }
    current += character;
    started = true;
  }
  if (started) words.push(current);
  return words;
}

function stepUsesUnreadableWord(step) {
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  return shellWords(joinShellContinuations(run.value)).some((word) => {
    if (SHELL_OPERATOR_WORD.has(word)) return false;
    const value = word.replace(/^[A-Za-z_][A-Za-z0-9_]*=/, "");
    return !WHOLE_WORD_FRAGMENT.some((form) => form.test(value));
  });
}

// `cp -R candidate staged && ./staged/evil` re-homes the proposed bytes under
// a name the execution scan has never heard of. Following that copy would be
// flow analysis; instead the tree may not be named in a write-capable job's
// shell at all. With globs, substitution, indirection, and splices refused,
// naming it outright is the only way left to designate it, so refusing that
// leaves no path that can come to hold its bytes. A step that genuinely needs
// the directory gets it from a managed script, which derives the path from
// `$GITHUB_WORKSPACE` itself — `scripts/verify-baseline-source.mjs` is the
// baseline's own instance of that.
function stepNamesTreeInShell(step, directory) {
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  return valueNamesTree(joinShellContinuations(run.value), directory);
}

// `>> "${!name}"` resolves to whatever `name` spells, so scanning for the
// literal `GITHUB_OUTPUT` reads a name the shell never has to write. Indirect
// expansion, command substitution, arithmetic, and the modifier forms are all
// ways to produce a word the scan cannot predict, so beside an untrusted
// checkout a shell may expand only whole variables — `$VAR`, `${VAR}`, and the
// simple specials. With assembly refused above, that makes the literal
// environment-file scan sound: those files can then only be named outright.
// Single-quoted spans cannot expand at all, so they are read as the literals
// they are.
function stepUsesUnreadableExpansion(step) {
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  const text = joinShellContinuations(run.value);
  let index = 0;
  let quote = null;
  while (index < text.length) {
    const character = text[index];
    if (quote === "'") {
      if (character === "'") quote = null;
      index += 1;
      continue;
    }
    if (character === "'" && quote === null) {
      quote = "'";
      index += 1;
      continue;
    }
    if (character === '"') {
      quote = quote === '"' ? null : '"';
      index += 1;
      continue;
    }
    if (character === "`") return true;
    if (character === "$") {
      const rest = text.slice(index + 1);
      if (/^[A-Za-z_][A-Za-z0-9_]*/.test(rest) || /^[?$!#*@0-9]/.test(rest)) {
        index += 1;
        continue;
      }
      if (/^\{[A-Za-z_][A-Za-z0-9_]*\}/.test(rest)) {
        index += 1;
        continue;
      }
      return true;
    }
    index += 1;
  }
  return false;
}

// `PATH: ${{ format('{0}/{1}', github.workspace, 'candidate') }}` resolves to
// the isolated checkout without the tree name surviving the boundary scan.
// Expressions are a full language, so a scanner cannot read what one
// assembles; beside an untrusted checkout an environment value may carry only
// expression forms that provably cannot build a path — a token, a named
// secret, a dispatch input, fixed run metadata, a trusted step's output, or a
// step outcome selecting between short literals — and the raw value, quoted
// literals included, still may not name the tree.
const TRUSTED_ENVIRONMENT_EXPRESSION = [
  /^github\.token$/,
  /^secrets\.[A-Za-z0-9_]+(?:\s*\|\|\s*github\.token)?$/,
  /^inputs\.[A-Za-z0-9_]+$/,
  /^github\.(?:server_url|repository|run_id|sha)$/,
  /^github\.event\.workflow_run\.(?:head_sha|conclusion|pull_requests\[0\]\.(?:base|head)\.sha)$/,
  /^steps\.[A-Za-z0-9_-]+\.outputs\.[A-Za-z0-9_-]+$/,
  /^steps\.[A-Za-z0-9_-]+\.outcome\s*==\s*'[A-Za-z0-9_-]+'\s*&&\s*'[A-Za-z0-9_-]+'\s*\|\|\s*'[A-Za-z0-9_-]+'$/
];

function computedEnvironmentValue(value) {
  const chunks = value.match(/\$\{\{[^}]*\}\}|\$\{\{/g) ?? [];
  return chunks.some((chunk) => {
    // A chunk the scanner cannot close — nested braces, an unterminated
    // expression — is unreadable, which is enough to refuse it.
    if (!chunk.endsWith("}}")) return true;
    const inner = chunk.slice(3, -2).trim();
    return !TRUSTED_ENVIRONMENT_EXPRESSION.some((pattern) => pattern.test(inner));
  });
}

function environmentCarriesComputedValue(node) {
  const env = mapPair(node, "env")?.value;
  if (!isMap(env)) return false;
  return env.items.some(
    (pair) =>
      isScalar(pair.value) &&
      typeof pair.value.value === "string" &&
      computedEnvironmentValue(pair.value.value)
  );
}

// Actions substitutes `${{ }}` into run text before the shell parses it, so
// what the shell actually runs is not the text being scanned. Beside an
// untrusted checkout a write-capable shell gets no interpolation at all —
// values arrive through `env`, where the forms above keep them readable.
function stepInterpolatesExpression(step) {
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  return run.value.includes("${{");
}

// `echo "$PWD/candidate" >> "$GITHUB_PATH"` puts the checkout on every later
// step's PATH, and `$GITHUB_ENV` persists arbitrary variables the same way.
// `$GITHUB_OUTPUT` feeds the allowlisted `steps.X.outputs.Y` form, and
// staging through intermediate files — `printf '%s/candidate' "$PWD" > result`
// then `cat result >> "$GITHUB_OUTPUT"` — defeats any line-local provenance
// scan. What flows into these files cannot be read statically, so beside an
// untrusted checkout all of them are off the table for free-form shell;
// outputs in that configuration come only from SHA-pinned actions or managed,
// hash-locked scripts, whose provenance is the lock rather than the scan.
const STEP_ENVIRONMENT_FILE = /\bGITHUB_(?:ENV|PATH|OUTPUT|STATE)\b/;

function stepTouchesEnvironmentFiles(step) {
  const run = mapPair(step, "run")?.value;
  if (!isScalar(run) || typeof run.value !== "string") return false;
  return STEP_ENVIRONMENT_FILE.test(run.value);
}

function dispatchOnlyJob(job) {
  const conditionNode = mapPair(job, "if")?.value;
  if (!isScalar(conditionNode) || typeof conditionNode.value !== "string") return false;
  if (conditionNode.anchor || conditionNode.tag) return false;
  const condition = conditionNode.value.replace(/^\$\{\{\s*/, "").replace(/\s*\}\}$/, "").trim();
  if (condition.includes("||") || condition.includes("?")) return false;
  const parts = condition.split(/\s*&&\s*/);
  const dispatchEvent = parts.some((part) =>
    /^\(*\s*github\.event_name\s*==\s*["']workflow_dispatch["']\s*\)*$/.test(part)
  );
  const defaultBranch = parts.some((part) =>
    /^\(*\s*github\.ref\s*==\s*format\(\s*["']refs\/heads\/\{0\}["']\s*,\s*github\.event\.repository\.default_branch\s*\)\s*\)*$/.test(part)
  );
  return dispatchEvent && defaultBranch;
}

function directUnsupportedConstructs(node, { blockScalar = false, mergeKey = false } = {}) {
  const kinds = new Set();
  if (!node) return kinds;
  if (isAlias(node)) kinds.add("alias");
  if (node.anchor) kinds.add("anchor");
  if (node.tag) kinds.add("tag");
  if (blockScalar && isScalar(node) && new Set(["BLOCK_FOLDED", "BLOCK_LITERAL"]).has(node.type)) {
    kinds.add("block scalar");
  }
  if (mergeKey && isMap(node) && node.items.some((pair) => isScalar(pair.key) && pair.key.value === "<<")) {
    kinds.add("merge key");
  }
  return kinds;
}

function validateMappingKeys(map, scope, failures, path) {
  if (!isMap(map)) return;
  for (const pair of map.items) {
    const kinds = directUnsupportedConstructs(pair.key, { blockScalar: true });
    if (isScalar(pair.key) && pair.key.value === "<<") kinds.add("merge key");
    for (const kind of kinds) {
      failures.push(`Workflow ${scope} key uses unsupported YAML ${kind}: ${path}`);
    }
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
      failures.push(`Workflow ${scope} keys must be undecorated string scalars: ${path}`);
    }
  }
}

function validateActionReference(node, failures, path) {
  for (const kind of directUnsupportedConstructs(node, { blockScalar: true })) {
    failures.push(`Workflow uses value uses unsupported YAML ${kind}: ${path}`);
  }
  if (!isScalar(node) || typeof node.value !== "string") {
    failures.push(`Workflow uses value must be a scalar action reference: ${path}`);
    return;
  }
  const action = node.value;
  if (action.startsWith("./")) return;
  if (action.startsWith("docker://")) {
    if (!/^docker:\/\/[^@\s]+@sha256:[a-f0-9]{64}$/.test(action)) {
      failures.push(`Docker action is not pinned to an immutable SHA-256 digest in ${path}: ${action}`);
    }
    return;
  }
  const ref = action.slice(action.lastIndexOf("@") + 1);
  if (!/^[a-f0-9]{40}$/.test(ref)) {
    failures.push(`GitHub Action is not pinned to a full commit SHA in ${path}: ${action}`);
  }
}

export function validateWorkflowText(path, text) {
  const failures = [];
  const document = parseDocument(text, {
    keepSourceTokens: true,
    prettyErrors: false,
    strict: true,
    uniqueKeys: true
  });
  for (const error of document.errors) {
    failures.push(`Invalid workflow YAML (${error.code}): ${path}: ${error.message}`);
  }
  for (const warning of document.warnings) {
    failures.push(`Unsupported workflow YAML (${warning.code}): ${path}: ${warning.message}`);
  }
  const root = document.contents;
  if (!isMap(root)) {
    failures.push(`Workflow document root must be a mapping: ${path}`);
  } else if (document.errors.length === 0) {
    validateMappingKeys(root, "root mapping", failures, path);
    const onPair = mapPair(root, "on");
    const events = onPair ? workflowEvents(onPair.value, failures, path) : new Set();
    if (!onPair) failures.push(`Workflow must declare triggers: ${path}`);
    if (events.has("pull_request_target")) {
      failures.push(`High-risk pull_request_target trigger in ${path}`);
    }
    const trustedPush = pushRestrictedToDefaultBranch(onPair?.value);
    const refSelectable = [...events].some((event) =>
      event === "push" ? !trustedPush : REF_SELECTABLE_EVENTS.has(event)
    );
    let topLevelWrites = false;
    const rootDefaults = mapPair(root, "defaults")?.value;
    const rootRunDefaults = isMap(rootDefaults) ? mapPair(rootDefaults, "run")?.value : undefined;
    const rootWorkingDirectory = isMap(rootRunDefaults)
      ? mapPair(rootRunDefaults, "working-directory")?.value
      : undefined;
    const topPermissions = mapPair(root, "permissions");
    if (!topPermissions) {
      failures.push(`Workflow must declare top-level permissions: ${path}`);
    } else {
      const writes = permissionWrites(topPermissions.value, "top-level permissions", failures, path);
      topLevelWrites = writes;
      if (isScalar(topPermissions.value) && topPermissions.value.value === "write-all") {
        failures.push(`Workflow may not use write-all permissions: ${path}`);
      }
      if (refSelectable && writes) {
        failures.push(
          `Ref-selectable workflow may not grant top-level write permissions: ${path}`
        );
      }
    }
    const jobs = mapPair(root, "jobs")?.value;
    if (jobs !== undefined && !isMap(jobs)) {
      failures.push(`Workflow jobs must be a mapping: ${path}`);
    } else if (isMap(jobs)) {
      for (const kind of unsupportedJobTreeConstructs(jobs)) {
        failures.push(`Workflow jobs use unsupported YAML ${kind}: ${path}`);
      }
      validateMappingKeys(jobs, "jobs mapping", failures, path);
      for (const jobPair of jobs.items) {
        const jobName = isScalar(jobPair.key) && typeof jobPair.key.value === "string"
          ? jobPair.key.value
          : "<invalid>";
        if (!isMap(jobPair.value)) {
          failures.push(`Workflow job ${jobName} must be a mapping: ${path}`);
          continue;
        }
        validateMappingKeys(jobPair.value, `job ${jobName} mapping`, failures, path);
        const reusableWorkflow = mapPair(jobPair.value, "uses");
        if (reusableWorkflow) validateActionReference(reusableWorkflow.value, failures, path);
        const jobSecrets = mapPair(jobPair.value, "secrets");
        if (jobSecrets && isScalar(jobSecrets.value) && jobSecrets.value.value === "inherit") {
          failures.push(`Workflow job ${jobName} may not inherit caller secrets: ${path}`);
        }
        const steps = mapPair(jobPair.value, "steps")?.value;
        if (steps !== undefined && !isSeq(steps)) {
          failures.push(`Workflow job ${jobName} steps must be a sequence: ${path}`);
        } else if (isSeq(steps)) {
          for (const step of steps.items) {
            for (const kind of directUnsupportedConstructs(step, { mergeKey: true })) {
              failures.push(`Workflow job ${jobName} step uses unsupported YAML ${kind}: ${path}`);
            }
            if (!isMap(step)) {
              failures.push(`Workflow job ${jobName} step must be a mapping: ${path}`);
              continue;
            }
            validateMappingKeys(step, `job ${jobName} step mapping`, failures, path);
            const uses = mapPair(step, "uses");
            if (uses) validateActionReference(uses.value, failures, path);
          }
        }
        const jobPermissions = mapPair(jobPair.value, "permissions");
        const writes = jobPermissions
          ? permissionWrites(jobPermissions.value, `job ${jobName} permissions`, failures, path)
          : topLevelWrites;
        if (writes && isSeq(steps)) {
          const refExpressionInScope =
            environmentRefExpression(root) || environmentRefExpression(jobPair.value);
          const isolated = [];
          for (const step of steps.items) {
            if (!isMap(step)) continue;
            if (stepNamesActorControlledRef(step, refExpressionInScope)) {
              failures.push(
                `Write-capable job ${jobName} names an actor-controlled ref in its shell: ${path}`
              );
            }
            const directory = untrustedCheckoutDirectory(step);
            if (directory === undefined) continue;
            if (directory === null) {
              failures.push(
                `Write-capable job ${jobName} checks an untrusted ref out over the workspace: ${path}`
              );
              continue;
            }
            isolated.push(directory);
          }
          // A job's own defaults win, but a workflow-level default applies to
          // every job that does not override it.
          const jobDefaults = mapPair(jobPair.value, "defaults")?.value;
          const jobRunDefaults = isMap(jobDefaults) ? mapPair(jobDefaults, "run")?.value : undefined;
          const jobWorkingDirectory = isMap(jobRunDefaults)
            ? mapPair(jobRunDefaults, "working-directory")?.value
            : undefined;
          const effectiveWorkingDirectory = jobWorkingDirectory ?? rootWorkingDirectory;
          // The effective default is what the steps inherit, so it is the one
          // that has to be statically knowable — job-level or workflow-level.
          const computedRootDefault =
            effectiveWorkingDirectory !== undefined &&
            (!isScalar(effectiveWorkingDirectory) ||
              typeof effectiveWorkingDirectory.value !== "string" ||
              effectiveWorkingDirectory.value.includes("${{"));
          for (const directory of isolated) {
            const defaultsEnterTree = directoryEntersUntrustedTree(effectiveWorkingDirectory, directory);
            if (environmentSeedsTree(root, directory) || environmentSeedsTree(jobPair.value, directory)) {
              failures.push(
                `Write-capable job ${jobName} seeds the environment with the untrusted checkout ${directory}: ${path}`
              );
            }
            if (environmentCarriesComputedValue(root) || environmentCarriesComputedValue(jobPair.value)) {
              failures.push(
                `Write-capable job ${jobName} carries a computed environment value alongside the untrusted checkout ${directory}: ${path}`
              );
            }
            for (const step of steps.items) {
              if (!isMap(step)) continue;
              if (stepExecutesFromDirectory(step, directory, defaultsEnterTree)) {
                failures.push(
                  `Write-capable job ${jobName} executes code from the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepSeedsEnvironmentWithTree(step, directory)) {
                failures.push(
                  `Write-capable job ${jobName} seeds the environment with the untrusted checkout ${directory}: ${path}`
                );
              }
              if (environmentCarriesComputedValue(step)) {
                failures.push(
                  `Write-capable job ${jobName} carries a computed environment value alongside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepAssemblesShellValue(step)) {
                failures.push(
                  `Write-capable job ${jobName} assembles a shell value alongside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepUsesUnreadableExpansion(step)) {
                failures.push(
                  `Write-capable job ${jobName} expands more than a whole variable alongside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepUsesUnreadableWord(step)) {
                failures.push(
                  `Write-capable job ${jobName} splices a shell word alongside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepNamesTreeInShell(step, directory)) {
                failures.push(
                  `Write-capable job ${jobName} names the untrusted checkout ${directory} in its shell: ${path}`
                );
              }
              if (stepUsesUnvouchedAction(step)) {
                failures.push(
                  `Write-capable job ${jobName} uses an action that is not vouched for beside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepInterpolatesExpression(step)) {
                failures.push(
                  `Write-capable job ${jobName} interpolates an expression into its shell alongside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepTouchesEnvironmentFiles(step)) {
                failures.push(
                  `Write-capable job ${jobName} touches the step environment files alongside the untrusted checkout ${directory}: ${path}`
                );
              }
              if (stepHasComputedWorkingDirectory(step) || (computedRootDefault && !mapPair(step, "working-directory"))) {
                failures.push(
                  `Write-capable job ${jobName} runs with a computed working directory alongside the untrusted checkout ${directory}: ${path}`
                );
              }
            }
          }
        }
        if (!jobPermissions) continue;
        if (refSelectable && writes && !dispatchOnlyJob(jobPair.value)) {
          failures.push(
            `Ref-selectable job ${jobName} may not grant write permissions: ${path}`
          );
        }
      }
    }
  }
  return failures;
}

export function scanRepository(root) {
  const failures = [];
  for (const path of REQUIRED_ROOT_FILES) {
    if (!existsSync(join(root, path))) failures.push(`Missing required repository file: ${path}`);
  }

  const files = repositoryFiles(root);
  const profileFiles = files.filter((file) => /^\.web-design\/profiles\/[a-z0-9-]+\.json$/.test(file));
  const profiles = {};
  for (const file of profileFiles) {
    const id = basename(file, ".json");
    try {
      profiles[id] = JSON.parse(readFileSync(join(root, file), "utf8"));
    } catch (error) {
      failures.push(`Invalid profile ${file}: ${error.message}`);
    }
  }
  const availableProfiles = Object.keys(profiles);
  try {
    const config = JSON.parse(readFileSync(join(root, ".web-design/project.json"), "utf8"));
    failures.push(...validateProjectConfig(config, profiles));
    const profile = profiles[config?.project?.profile];
    const deploymentRoot = config?.deployment?.rootDirectory || ".";
    for (const required of profile?.requiredProjectFiles ?? []) {
      if (!existsSync(join(root, deploymentRoot, required))) {
        failures.push(`Profile ${profile.id} requires ${join(deploymentRoot, required)}`);
      }
    }
    const lock = JSON.parse(readFileSync(join(root, ".web-design/lock.json"), "utf8"));
    if (lock.profile !== config?.project?.profile) {
      failures.push("lock.profile must match project.profile");
    }
  } catch (error) {
    failures.push(`Invalid .web-design/project.json: ${error.message}`);
  }

  for (const file of files) {
    const normalized = file.split(sep).join("/");
    const parts = normalized.split("/");
    const fileName = basename(normalized);
    if (parts.some((part) => FORBIDDEN_SEGMENTS.has(part))) {
      failures.push(`Generated or dependency directory is tracked: ${normalized}`);
    }
    if (FORBIDDEN_NAMES.some((pattern) => pattern.test(fileName)) && fileName !== ".env.example") {
      failures.push(`Sensitive or local-only file is tracked: ${normalized}`);
    }
    const absolute = join(root, file);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      failures.push(`Repository path is missing from the worktree: ${normalized}`);
      continue;
    }
    if (stat.isSymbolicLink()) {
      failures.push(`Symbolic links are not allowed: ${normalized}`);
      continue;
    }
    if (!stat.isFile() || stat.size > 2_000_000) continue;
    const buffer = readFileSync(absolute);
    if (looksBinary(buffer)) continue;
    const text = buffer.toString("utf8");
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(text)) failures.push(`Possible ${label} in ${normalized}`);
    }
    if (PERSONAL_PATH_PATTERNS.some((pattern) => pattern.test(text))) {
      failures.push(`Personal absolute path in ${normalized}`);
    }
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(normalized)) {
      failures.push(...validateWorkflowText(normalized, text));
    }
  }
  return { failures, files, availableProfiles };
}

export function main(argv = process.argv.slice(2)) {
  const root = parseRoot(argv);
  const result = scanRepository(root);
  if (result.failures.length) {
    console.error("Repository guard failed:");
    for (const message of result.failures) console.error(`- ${message}`);
    return 1;
  }
  console.log(
    `Repository guard passed for ${result.files.length} files and ` +
      `${result.availableProfiles.length} profile(s).`
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
