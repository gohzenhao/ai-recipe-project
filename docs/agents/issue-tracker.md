# Issue tracker: GitHub

New issues and PRDs for this repo live as **GitHub issues** in `gohzenhao/ai-recipe-project`. Use the `gh` CLI for all operations — it picks up the repo from `git remote` automatically.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with `--label` / `--state` filters as needed.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

If a label referenced by a skill (e.g. `ready-for-agent`) doesn't exist yet, create it once with `gh label create "<name>" --description "..." --color "<hex>"` rather than skipping the label.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Historical issues (pre-GitHub)

PRDs `0001` and `0002` and their derived issues live as markdown under `docs/prd/` and `docs/issues/` (with completed issues in `docs/issues/done/`). Treat those as historical record — do not migrate them retroactively, and don't reference them as the "issue tracker" for new work. New PRDs and issues go to GitHub from now on.
