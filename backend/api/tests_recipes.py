"""Tests for the recipes list service and endpoint."""

from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase

from .models import Recipe
from .recipes_services import list_recipes

User = get_user_model()


def _make_user(email: str) -> User:
    return User.objects.create_user(
        email=email,
        password="correct-horse-99",
        display_name=email.split("@", 1)[0],
    )


class ListRecipesOwnerFilterTests(TestCase):
    def test_returns_only_recipes_owned_by_the_given_owner(self) -> None:
        alice = _make_user("alice@example.com")
        bob = _make_user("bob@example.com")
        Recipe.objects.create(owner=alice, title="A1")
        Recipe.objects.create(owner=alice, title="A2")
        Recipe.objects.create(owner=bob, title="B1")

        items, total = list_recipes(
            owner=alice, page=1, per_page=20, sort="-updated_at"
        )

        self.assertEqual(total, 2)
        self.assertEqual({r.title for r in items}, {"A1", "A2"})


class ListRecipesSortTests(TestCase):
    def setUp(self) -> None:
        self.alice = _make_user("alice@example.com")
        # Insertion order intentionally jumbled relative to title sort.
        for title in ("Beta", "Alpha", "Gamma"):
            Recipe.objects.create(owner=self.alice, title=title)

    def test_sort_by_title_ascending(self) -> None:
        items, _ = list_recipes(
            owner=self.alice, page=1, per_page=20, sort="title"
        )
        self.assertEqual([r.title for r in items], ["Alpha", "Beta", "Gamma"])

    def test_sort_by_title_descending(self) -> None:
        items, _ = list_recipes(
            owner=self.alice, page=1, per_page=20, sort="-title"
        )
        self.assertEqual([r.title for r in items], ["Gamma", "Beta", "Alpha"])

    def test_default_sort_is_updated_at_descending(self) -> None:
        # setUp inserts Beta, Alpha, Gamma in that order; auto_now sets
        # updated_at in insertion order, so newest-first is Gamma, Alpha, Beta.
        items, _ = list_recipes(
            owner=self.alice, page=1, per_page=20, sort="-updated_at"
        )
        self.assertEqual([r.title for r in items], ["Gamma", "Alpha", "Beta"])

    def test_sort_by_updated_at_ascending_returns_oldest_first(self) -> None:
        items, _ = list_recipes(
            owner=self.alice, page=1, per_page=20, sort="updated_at"
        )
        self.assertEqual([r.title for r in items], ["Beta", "Alpha", "Gamma"])


class ListRecipesPaginationTests(TestCase):
    def setUp(self) -> None:
        self.alice = _make_user("alice@example.com")
        # 5 recipes with distinct titles, sortable a..e.
        for letter in "abcde":
            Recipe.objects.create(owner=self.alice, title=letter)

    def test_first_page_returns_first_per_page_rows(self) -> None:
        items, total = list_recipes(
            owner=self.alice, page=1, per_page=2, sort="title"
        )
        self.assertEqual(total, 5)
        self.assertEqual([r.title for r in items], ["a", "b"])

    def test_last_page_returns_remainder_when_total_does_not_divide_evenly(
        self,
    ) -> None:
        items, total = list_recipes(
            owner=self.alice, page=3, per_page=2, sort="title"
        )
        self.assertEqual(total, 5)
        self.assertEqual([r.title for r in items], ["e"])


class ListRecipesOutOfRangeTests(TestCase):
    def test_out_of_range_page_returns_empty_items_with_correct_total(
        self,
    ) -> None:
        alice = _make_user("alice@example.com")
        for _ in range(3):
            Recipe.objects.create(owner=alice, title="x")

        items, total = list_recipes(
            owner=alice, page=99, per_page=10, sort="-updated_at"
        )
        self.assertEqual(items, [])
        self.assertEqual(total, 3)


class ListRecipesPerPageExtremesTests(TestCase):
    def test_per_page_of_one_returns_a_single_row(self) -> None:
        alice = _make_user("alice@example.com")
        for letter in "abc":
            Recipe.objects.create(owner=alice, title=letter)

        items, total = list_recipes(
            owner=alice, page=1, per_page=1, sort="title"
        )
        self.assertEqual(total, 3)
        self.assertEqual([r.title for r in items], ["a"])

    def test_per_page_of_one_hundred_returns_all_rows_when_total_is_smaller(
        self,
    ) -> None:
        alice = _make_user("alice@example.com")
        for i in range(7):
            Recipe.objects.create(owner=alice, title=f"r{i:02d}")

        items, total = list_recipes(
            owner=alice, page=1, per_page=100, sort="title"
        )
        self.assertEqual(total, 7)
        self.assertEqual(len(items), 7)


class RecipesListEndpointAuthTests(TestCase):
    def test_unauthenticated_request_returns_401(self) -> None:
        client = Client(enforce_csrf_checks=True)
        response = client.get("/api/recipes/")
        self.assertEqual(response.status_code, 401)


def _login(client: Client, email: str, password: str = "correct-horse-99") -> None:
    """Seed CSRF, log in as `email`. Mirrors the auth_endpoint test helper."""
    response = client.get("/api/auth/me")
    csrf = response.cookies["csrftoken"].value
    response = client.post(
        "/api/auth/login",
        data=json.dumps({"email": email, "password": password}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf,
    )
    assert response.status_code == 200, response.content


class RecipesListEndpointHappyPathTests(TestCase):
    def test_authenticated_returns_200_envelope_with_owner_rows(self) -> None:
        alice = _make_user("alice@example.com")
        Recipe.objects.create(owner=alice, title="A1")
        Recipe.objects.create(owner=alice, title="A2")

        client = Client(enforce_csrf_checks=True)
        _login(client, "alice@example.com")
        response = client.get("/api/recipes/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body.keys()), {"items", "total", "page", "per_page"})
        self.assertEqual(body["total"], 2)
        self.assertEqual(body["page"], 1)
        self.assertEqual(body["per_page"], 20)
        self.assertEqual({row["title"] for row in body["items"]}, {"A1", "A2"})
        # Each row exposes only id/title/updated_at — nothing else from Recipe.
        for row in body["items"]:
            self.assertEqual(set(row.keys()), {"id", "title", "updated_at"})


class RecipesListEndpointQueryParamsTests(TestCase):
    def test_respects_sort_page_and_per_page_query_params(self) -> None:
        alice = _make_user("alice@example.com")
        for letter in "abcde":
            Recipe.objects.create(owner=alice, title=letter)

        client = Client(enforce_csrf_checks=True)
        _login(client, "alice@example.com")
        response = client.get("/api/recipes/?sort=title&page=2&per_page=2")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["page"], 2)
        self.assertEqual(body["per_page"], 2)
        self.assertEqual([row["title"] for row in body["items"]], ["c", "d"])


class RecipesListEndpointValidationTests(TestCase):
    def setUp(self) -> None:
        self.user = _make_user("alice@example.com")
        self.client = Client(enforce_csrf_checks=True)
        _login(self.client, "alice@example.com")

    def _assert_422_on_field(self, url: str, field: str) -> None:
        response = self.client.get(url)
        self.assertEqual(response.status_code, 422, response.content)
        details = response.json()["detail"]
        self.assertTrue(
            any(field in entry.get("loc", []) for entry in details),
            f"expected a `{field}` field-level error, got: {details!r}",
        )

    def test_sort_outside_enum_returns_422(self) -> None:
        self._assert_422_on_field("/api/recipes/?sort=banana", "sort")

    def test_per_page_below_one_returns_422(self) -> None:
        self._assert_422_on_field("/api/recipes/?per_page=0", "per_page")

    def test_per_page_above_one_hundred_returns_422(self) -> None:
        self._assert_422_on_field("/api/recipes/?per_page=101", "per_page")

    def test_page_below_one_returns_422(self) -> None:
        self._assert_422_on_field("/api/recipes/?page=0", "page")

    def test_non_integer_page_returns_422(self) -> None:
        self._assert_422_on_field("/api/recipes/?page=abc", "page")

    def test_non_integer_per_page_returns_422(self) -> None:
        self._assert_422_on_field("/api/recipes/?per_page=abc", "per_page")


class RecipesListEndpointIsolationTests(TestCase):
    def test_authenticated_user_never_sees_another_users_recipes(self) -> None:
        alice = _make_user("alice@example.com")
        bob = _make_user("bob@example.com")
        Recipe.objects.create(owner=alice, title="alice-only")
        Recipe.objects.create(owner=bob, title="bob-only")

        client = Client(enforce_csrf_checks=True)
        _login(client, "alice@example.com")
        response = client.get("/api/recipes/")

        self.assertEqual(response.status_code, 200)
        titles = {row["title"] for row in response.json()["items"]}
        self.assertEqual(titles, {"alice-only"})


class ListRecipesSortStabilityTests(TestCase):
    def test_tiebreaker_orders_tied_rows_by_descending_id(self) -> None:
        """The contract is a deterministic `-id` tiebreaker on the primary sort
        field. Observable from outside the service: when the primary field ties
        across all rows, the rows must come back in strictly descending `id`
        order — i.e., the newest insertion first."""
        alice = _make_user("alice@example.com")
        for _ in range(4):
            Recipe.objects.create(owner=alice, title="Same")

        items, _ = list_recipes(
            owner=alice, page=1, per_page=10, sort="title"
        )
        ids = [r.id for r in items]
        self.assertEqual(ids, sorted(ids, reverse=True))
