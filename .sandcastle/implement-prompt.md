# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view <ID>`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits and run tests.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

Follow the test-driven development workflow defined in @.sandcastle/tdd/SKILL.md.

In short: work in vertical slices, not horizontal ones — one test → minimal
implementation → repeat, never all tests up front. Test behavior through public
interfaces (so tests survive refactors), and only refactor once tests are green.

# FEEDBACK LOOPS

Before each commit, run the checks for the layer you touched and make them pass:

- Backend (`backend/`): `cd backend && uv run ruff check . && uv run python manage.py test`
- Frontend (`frontend/`): `cd frontend && npm run lint && npm run build` (add `npm run test` if you changed logic)

If your change spans both layers, run both.

# COMMIT

Make a git commit. The message must:

1. Have a concise subject line describing what changed — no tool or agent prefix.
2. Reference the issue in the body with `Refs #{{TASK_ID}}` (use `Refs`, not `Closes`
   — the pull request closes the issue when a human merges it).
3. Note any key decisions, and any blockers or follow-ups for the next iteration.

Keep it concise.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# BAILING OUT

If you hit an environmental blocker you cannot resolve from inside the sandbox — a missing env var, a system package you'd need root + a Dockerfile change to install, a database that isn't reachable, a contradicting requirement in the spec, etc. — STOP. Do not burn iterations on workarounds.

Concretely, bail when:

- A command fails with the same root cause more than 2 times in a row, AND the fix would require changing the Dockerfile, the host machine, or the issue itself.
- You catch yourself trying multiple unrelated workarounds for the same problem (e.g., `apt-get install`, `brew`, manual download).
- A required input (env var, file, service) is missing and you can't synthesize it without making up values that would land in commits.

When you bail:

1. Do NOT make any speculative commits to "save partial progress" — partial work without a green feedback loop is worse than no work.
2. Leave a comment on the issue via `gh issue comment {{TASK_ID}} --body "..."` describing the blocker concretely: which command was run, the exact error, what would unblock it (env var name, package name, decision needed).
3. Output `<promise>BLOCKED</promise>` to exit cleanly.

`BLOCKED` is a valid, expected outcome. It tells the operator that the environment or the spec needs to change before this work can proceed. Stopping early on a real blocker is always better than 50 iterations of flailing.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
