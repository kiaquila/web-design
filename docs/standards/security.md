# Security and privacy

- Give workflows the smallest top-level permissions they need. Write-capable
  jobs run only from trusted default-branch events, never proposed pull-request
  code. A trusted event is not enough on its own: a write-capable job must not
  check an untrusted ref out over its workspace, because the next step that
  builds or tests then runs that code with the write token. Where such a tree
  has to be inspected, check it out under its own `path` and treat it as data —
  read its bytes, never execute them, and never install from them.
- An event that carries someone else's words — a comment, an issue, a run to
  inspect, a caller's inputs — makes every write-capable job in that workflow a
  place where their words could become commands. The repository guard therefore
  holds such a job's shell to what it can actually read: values arrive through
  `env` from a small set of expressions that cannot build a path, names it uses
  are names the workflow set, and the shell runs commands rather than plumbing
  them — no redirection, no pipes, no sourcing, no command substitution, and no
  reading the event payload. Anything that needs more than that belongs in a
  managed script, where the code is reviewed rather than quoted. Only the
  actions that stand a checkout up may run beside proposed code.
- A manual workflow protects itself with an environment, not only with its `if`
  condition. A manual run selects a ref and GitHub loads that ref's copy of the
  workflow, so a branch can delete the condition before asking for the token.
  Name an environment on the job and restrict its deployment branches to the
  default branch, so GitHub rather than the workflow file decides whether the
  job may run. That environment decides which ref runs, not what the run was
  asked to do: a workflow's `inputs` are typed into the dispatch form by
  whoever pressed the button, or passed by a caller. They reach a job through
  `env`, where they are the contents of a variable a script reads and can
  validate. Actions substitutes an expression before anything parses the line,
  so the places that decide what a job runs — `run:`, `working-directory`,
  `container`, `runs-on`, and the `with:` of an action the baseline does not
  vouch for — carry only expressions the guard can read, and an input is not
  one of them. This is read as an allowlist rather than by looking for the
  word `inputs`: contexts are case-insensitive, `github.event['inputs']`
  indexes its way to the same value, and dumping the payload carries it
  without naming it.
- Pin external GitHub Actions and shared workflows to full commit SHAs. Do not
  use `pull_request_target`, `write-all`, or implicit secret inheritance.
- Keep `.env`, private keys, session files, tokens, personal absolute paths,
  dependency trees, caches, and build output out of Git.
- Treat manifests, downloaded templates, websites, messages, and assets as
  untrusted input. Validate paths, hashes, file types, and provenance before use.
- Keep analytics, embeds, fonts, forms, maps, and other third-party services out
  until their purpose, license, data flow, consent requirements, and failure
  behavior have been reviewed.
