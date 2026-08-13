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
- [`ks/`](./ks/) — Kristina Aquila's own bilingual web design portfolio and
  selling landing page.

Menus can be a deliverable inside a business project, as they are for Chaijaná.
Reusable menu tooling or a menu-focused product should live in its own future
repository rather than turning this workspace into a menu monorepo.

## Starting a project

1. Create `<business-slug>/` in lower-case kebab-case.
2. Add `<business-slug>/README.md` with the business context, requested
   deliverables, verified sources, approved concept, open questions, and checks.
3. Add `<business-slug>/AGENTS.md` with only the rules that are specific to that
   business or implementation.
4. Add the slug to `projects` in [`.repo-guard.json`](./.repo-guard.json).
5. Add the project to this index and run `node scripts/check-repository.mjs`.

If the project needs a temporary customer-facing stage, follow
[`docs/stage-hosting.md`](./docs/stage-hosting.md). Active stages are listed in
`stageProjects` in [`.repo-guard.json`](./.repo-guard.json); each uses a
`<business-slug>` Cloudflare Worker at
`https://<business-slug>.ks-design.workers.dev`, a stable `main` deployment,
and an isolated public preview for every pull request.

## Guardrails

Pull requests run repository policy checks, project tests, a dependency
vulnerability scan, and a current-head Codex review gate. The policy check
rejects common secrets and private keys, personal absolute paths, tracked
generated output, unsafe workflow triggers, un-pinned GitHub Actions, and
project folders without their local context files.

The implementation and maintainer setup are documented in
[`docs/repository-guardrails.md`](./docs/repository-guardrails.md).
