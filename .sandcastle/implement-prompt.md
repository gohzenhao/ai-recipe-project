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

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
