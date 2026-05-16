# Recipe App

The domain of this monorepo: people storing and managing their own recipes, with AI features that extract recipes from external sources (URLs, images) and assist with scaling and substitutions.

## Language

**User**:
The person who owns recipes; the unit of identity authenticated by Django auth.
_Avoid_: Account, member, profile.

**Recipe**:
A user-owned collection of instructions and ingredients describing a dish.
_Avoid_: Dish, meal, post.

**RecipeIngredient**:
A positioned row on a `Recipe` carrying `qty`, `unit`, `item_text`, and `note`.
_Avoid_: Ingredient (bare), line item.

**RecipeSource**:
A historical record of one extraction attempt against a `Recipe` — manual entry, URL, or image — including which AI model produced it and whether it is the current one.
_Avoid_: Extraction, import, attempt.

**Owner**:
The `User` that a `Recipe` belongs to.
_Avoid_: Author, creator.

**Source**:
The origin of a recipe's content (URL, image, or manual entry). Always refers to a `RecipeSource`, never a code source file.
_Avoid_: Origin, import, reference.

## Relationships

- A **User** owns many **Recipes**.
- A **Recipe** has many **RecipeIngredients**, ordered by `position`.
- A **Recipe** has many **RecipeSources**, at most one of which is marked current at any time.
- A **Recipe** has exactly one **Owner** (a **User**).

## Example dialogue

> **Dev:** "If a **User** uploads a photo of a cookbook page and the AI extracts a **Recipe** from it, how do we represent the ingredients?"
> **Domain expert:** "Each line on the page becomes one **RecipeIngredient** on that **Recipe**, with its `position` matching the order on the page. They live on the **Recipe** — there's no shared 'flour' row across users' recipes."
>
> **Dev:** "So if two **Users** both have a recipe that uses flour, those are separate **RecipeIngredient** rows?"
> **Domain expert:** "Right. **RecipeIngredient** is per-**Recipe**. We don't have a global ingredient concept and we're not planning one — substitutions and scaling work fine on the per-recipe rows."
>
> **Dev:** "And if the user re-extracts the same recipe a year later with a better model?"
> **Domain expert:** "That's a new **RecipeSource** attached to the same **Recipe**. The old one stays in history; the new one gets marked current."

## Flagged ambiguities

- "Source" was ambiguous between a code source file and a recipe's origin — resolved: in this domain, **Source** always means **RecipeSource**.
- "Ingredient" on its own is avoided because it suggests a global, shared concept; the actual model is **RecipeIngredient** (per-recipe). If a global ingredient master table is ever introduced, it would need a new term.
