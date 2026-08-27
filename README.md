# Design

Private, version-controlled workspace for designs and redesigns of existing
businesses: landing pages, compact websites, and adjacent digital deliverables.

## Project model

Each business has one lower-case kebab-case top-level directory. That directory
is the boundary for its source material, concept, design decisions, code,
working documents, and verification commands.

```text
<business-slug>/
├── README.md     # product context, deliverables, sources, and current decisions
├── AGENTS.md     # project-specific instructions and constraints
└── ...           # implementation and project working documents
```

The root [`AGENTS.md`](./AGENTS.md) applies across the repository. A nested
`AGENTS.md` adds instructions for its directory tree, so project-specific agent
context is both supported and preferred. Nested instructions may refine the
workflow, brand, content sources, or test commands; they may not relax root
safety rules. [`CLAUDE.md`](./CLAUDE.md) points Claude Code at the same source of
truth instead of maintaining a second copy.

## Projects

- [`alex-neon/`](./alex-neon/) — «ИИ по делу» AI-training landing by Aleksei
  Grishchenko, redesigned under the **Alex Neon** concept.
- [`alphacentr/`](./alphacentr/) — Alpha-Centr hypnosis practice website and
  audio-session catalogue, redesigned under the **Alpha Lumen** concept.
- [`chaijana/`](./chaijana/) — Chaijaná restaurant website and multilingual
  menu, redesigned under the **Chaijaná Noir** concept.
- [`ember/`](./ember/) — **Ember**, a ks-design lab study: an interactive
  burning-and-reassembling particle figure with a synthesized tuning-fork
  score, after a motion reference pinned from `@skvortsov.design`.
- [`ks/`](./ks/) — retained pre-migration copy of Kristina Aquila's bilingual
  portfolio; the production source and deploy automation live in
  [`kiaquila/ks`](https://github.com/kiaquila/ks).
- [`misha/`](./misha/) — Mikhail Orlov's one-page English CV portfolio, an
  original design staged at
  [misha.ks-design.workers.dev](https://misha.ks-design.workers.dev).

Menus can be a deliverable inside a business project, as they are for Chaijaná.
Reusable menu tooling or a menu-focused product should live in its own future
repository rather than turning this workspace into a menu monorepo.

## Lightweight project template

[`template/`](./template/) is the small, customer-free reference harness for
new standalone web-design repositories. It contains the reusable instructions,
CI policy, project-command runner, and configurable payload-budget check. It is
an example to copy and adapt in a reviewed migration PR, not a package or a
centrally managed baseline.

There is deliberately no release, lock, manifest, sync, update-bot, or
upstream-verification protocol. Existing projects choose the files and rules
that fit their stack, keep them locally, and receive later improvements only
through an explicit manual PR. See
[`docs/template-adoption.md`](./docs/template-adoption.md).

## Starting a project

1. Create `<business-slug>/` in lower-case kebab-case.
2. Add `<business-slug>/README.md` with the business context, requested
   deliverables, verified sources, approved concept, open questions, and checks.
3. Add `<business-slug>/AGENTS.md` with only the rules that are specific to that
   business or implementation.
4. Add the slug to `projects` in [`.repo-guard.json`](./.repo-guard.json).
5. Add the project to this index and run `node scripts/check-repository.mjs`.

Cloudflare build and stage checks are under a migration moratorium in this
repository. The historical configuration remains documented in
[`docs/stage-hosting.md`](./docs/stage-hosting.md), but it is no longer enforced
or run here. Each standalone project will re-enable only the deployment checks
that match its own hosting after its migration is verified.

## Guardrails

Pull requests run repository policy checks, every retained project's tests, the
standalone template harness, a dependency vulnerability scan, and a
current-head Codex review gate. The policy check
rejects common secrets and private keys, personal absolute paths, tracked
generated output, unsafe workflow triggers, un-pinned GitHub Actions, and
project folders without their local context files.

The standalone template adds a configurable production-payload budget based on
the proven `alex-neon` check: raw and gzip totals, per-extension ceilings, and a
critical first-render gzip ceiling.

The implementation and maintainer setup are documented in
[`docs/repository-guardrails.md`](./docs/repository-guardrails.md).
