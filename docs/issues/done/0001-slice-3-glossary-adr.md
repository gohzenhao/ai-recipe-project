# Slice 3: Glossary and ADR for the auth decision

Type: AFK
Label to apply on publish: `ready-for-agent`

## Parent

PRD draft: `docs/prd/0001-initial-schema.md` (to be replaced with a GitHub Issue link once the PRD itself is published).

## What to build

Create the project's domain glossary (`CONTEXT.md` at the repo root) and the first Architecture Decision Record. These capture decisions that are already fully settled by the PRD but need durable homes outside the PRD itself: a glossary because future contributors will use these terms, and an ADR because the choice to use Django's auth instead of the already-provisioned Neon Auth is hard to reverse and surprising-without-context.

Follow the format files in `.claude/skills/grill-with-docs/`:
- `CONTEXT-FORMAT.md` for the glossary structure (Language / Relationships / Example dialogue / Flagged ambiguities).
- `ADR-FORMAT.md` for ADR length and content (one short paragraph is fine; only add optional sections if they add real value).

## Acceptance criteria

- [ ] `CONTEXT.md` exists at the repository root.
- [ ] The **Language** section in `CONTEXT.md` defines each of the following terms in one sentence, with aliases-to-avoid where useful:
  - **User** — the person who owns recipes; the unit of identity authenticated by Django auth.
  - **Recipe** — a user-owned collection of instructions and ingredients describing a dish.
  - **RecipeIngredient** — a positioned row on a `Recipe` carrying `qty`, `unit`, `item_text`, `note`.
  - **RecipeSource** — a historical record of one extraction attempt against a `Recipe` (manual entry, URL, or image).
  - **Owner** — the `User` that a `Recipe` belongs to. Avoid: "author", "creator".
  - **Source** — the origin of a recipe's content (URL, image, or manual entry). Always refers to a `RecipeSource`, not a code source file.
- [ ] The **Relationships** section captures:
  - A **User** owns many **Recipes**.
  - A **Recipe** has many **RecipeIngredients**, ordered by `position`.
  - A **Recipe** has many **RecipeSources**, at most one of which is marked current at any time.
- [ ] An example dialogue between a dev and a domain expert is included, demonstrating natural use of the terms and clarifying the boundary between `RecipeIngredient` (per-recipe) and any future global-ingredient concept.
- [ ] `docs/adr/0001-django-auth-with-custom-user-model.md` exists and records, in one short paragraph, that:
  - The recipe app uses Django's built-in auth with a custom user model (`AbstractUser` subclass), not Neon Auth, despite Neon Auth being provisioned in the same Neon project.
  - The reason: keeping identity in Django-owned tables simplifies integration with the rest of the Django stack and avoids token-verification middleware; the Neon Auth schema is left untouched but unused.
  - The custom user model further uses email (not username) as the unique login identifier, locked in by `USERNAME_FIELD`.

## Blocked by

None — content is fully settled by the PRD and can run in parallel with Slice 1 and Slice 2.
