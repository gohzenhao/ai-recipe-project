# TASK

Open a pull request for each completed branch below. **Do not merge anything and
do not close any issues** — a human reviews and merges each PR.

Completed work (one line per issue):

{{TASKS}}

Every PR targets the base branch `{{BASE}}`.

# FOR EACH BRANCH

## 1. Push the branch

This repo's remote is **not** necessarily named `origin`. Discover it first:

```
git remote
```

Then push the branch and set upstream:

```
git push --set-upstream <remote> <branch>
```

## 2. Open the pull request

```
gh pr create --base {{BASE}} --head <branch> --title "<issue title>" --body "<body>"
```

The PR body **must** contain the line `Closes #<id>` (using the issue id from the
list above) so GitHub closes the issue automatically when a human merges the PR.
Below that line, summarize what changed — read the commit list with
`git log {{BASE}}..<branch> --format="- %s"` and include it.

If `gh` reports that a PR already exists for the branch, **skip creation** — do not
open a duplicate.

## 3. Hand the issue off to review

So the planner won't pick this issue again next iteration:

```
gh issue edit <id> --remove-label Sandcastle
gh label create in-review --color FBCA04 --description "PR open, awaiting human review" 2>/dev/null || true
gh issue edit <id> --add-label in-review
```

# RULES

- Never run `git merge`. Never run `gh pr merge`. Never run `gh issue close`.
- Exactly one PR per branch.

Once every branch has a PR (newly created, or an existing one was found), output
<promise>COMPLETE</promise>.
