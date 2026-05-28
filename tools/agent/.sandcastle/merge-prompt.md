# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run the checks for the layers that changed and make them pass:
   - Backend (`backend/`): `cd backend && uv run ruff check . && uv run python manage.py test`
   - Frontend (`frontend/`): `cd frontend && npm run lint && npm run build` (add `npm run test` if logic changed)
4. If any check fails, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

# CLOSE ISSUES

For each branch that was merged, close its issue using the following command:

`gh issue close <ID> --comment "Completed by Sandcastle"`

Here are all the issues:

{{ISSUES}}

Once you've merged everything you can, output <promise>COMPLETE</promise>.
