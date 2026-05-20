# ISSUES

Local issue files from `docs/issues/` are provided at the start of context. Parse them to understand the open issues.

Each issue file declares a `Type:` line near the top with either `AFK` or `HITL`. You will work on the AFK issues only — skip HITL.

You've also been passed a file containing the last few commits. Review these to understand what work has already been done.

If all AFK tasks are complete, output `<promise>NO MORE TASKS</promise>`.

# TASK SELECTION

Pick the next task. Prioritize in this order:

1. Critical bugfixes
2. Development infrastructure (tests, type-checking, dev scripts, CI) — an important precursor to feature work
3. Tracer bullets — thin vertical slices through all layers (schema, API, UI, tests). Build a tiny end-to-end slice first, then expand
4. Polish and quick wins
5. Refactors

Respect dependencies declared in each issue's `Blocked by` section. Do not start an issue whose blockers are unfinished — if every remaining AFK issue is blocked, pick the unblocked blocker first.

# REPO LAYOUT

This is a monorepo:

- `backend/` — Django 6 + Django Ninja, Python 3.13, dependencies managed by `uv` (see `backend/pyproject.toml`).
- `frontend/` — React 18 + Vite + TypeScript, dependencies managed by `npm`.
- `docs/issues/` — open issue files (AFK and HITL).
- `docs/issues/done/` — completed issue files.
- `docs/prd/` — published PRDs (read the relevant PRD before starting an issue).
- `docs/adr/` — Architecture Decision Records. Respect existing ADRs in the area you're touching.
- `CONTEXT.md` (if it exists) — domain glossary. Use these terms in code, comments, and commit messages.

CLAUDE.md files at the repo root, `backend/`, and `frontend/` are loaded into your context automatically — follow the conventions they declare.

# EXPLORATION

Before writing code, explore the repo state relevant to the issue: existing models, settings, migrations, components, tests. Read the parent PRD if the issue references one.

# IMPLEMENTATION

Use the `/tdd` skill where it applies (any feature or fix with observable behaviour). For pure-schema, migration-only, or docs-only tasks where TDD does not naturally apply, implement directly — but still cover the behaviours listed in the issue's Acceptance Criteria with tests when the issue calls for them.

# FEEDBACK LOOPS

Before committing, run the checks for whichever layers you touched. Skip the layers you did not touch.

Backend (only if files under `backend/` changed):

- `cd backend && uv run ruff check .` — lint
- `cd backend && uv run python manage.py test` — tests

Frontend (only if files under `frontend/` changed):

- `cd frontend && npm run lint` — lint
- `cd frontend && npm run build` — typecheck + build (`tsc -b` runs as part of `build`)

All applicable checks must pass before committing. Do not bypass hooks with `--no-verify`.

# COMMIT

Make a git commit. The commit message must include:

1. Key decisions made (the *why*, not just the *what*)
2. A short summary of what changed at the conceptual level (e.g. "added custom User model", "wired up signup endpoint") — not a list of file paths
3. Any blockers, follow-ups, or notes for the next iteration

# THE ISSUE

If the task is complete, move the issue file to `docs/issues/done/` (create the directory if it doesn't exist).

If the task is not complete, append a note to the issue file describing what was done so far and what remains for a follow-up iteration.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
