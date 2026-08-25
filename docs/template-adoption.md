# Manual template adoption

The files under [`../template/`](../template/) are a reference harness, not a
dependency. They are copied manually so every project receives only the rules
and checks that match its actual stack.

## New repository

1. Copy the contents of `template/` into the new repository without copying the
   `template/` directory itself.
2. Replace the project placeholders in `README.md`, `AGENTS.md`,
   `web-design.config.json`, and `.github/CODEOWNERS`.
3. Merge the sample package scripts into the project's package files rather
   than overwriting an existing toolchain.
4. Configure real check commands, the production output directory, exact
   critical first-render files, and measured payload budgets.
5. Run `npm run preflight`, inspect the smallest and largest supported layouts,
   and open a focused setup PR.

## Existing repository

Adopt the harness in a dedicated migration branch. Preserve the repository's
history, application code, assets, business documentation, deployment files,
package manager, and existing checks. Copy one concern at a time when useful:

- instructions and standards;
- repository safety check;
- project command runner;
- payload-budget check;
- CI workflow and CODEOWNERS.

Do not replace project-owned configuration merely to match the example. Record
why each copied file applies and why any template file was intentionally
omitted.

## Later improvements

There is no automatic update path. Compare the template with a project, copy
only the relevant changes, and open a normal PR. The review must show the
project's own tests and performance budgets before and after the change.

## Migration stop rule

Do not delete a project from `web-design` until its destination history, files,
assets, docs, settings, checks, deployment, and rollback point have been
verified independently. Cloudflare checks remain disabled here during this
transition and are re-enabled only in the verified destination repository.
