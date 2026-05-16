import json

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import Client, TestCase

from .auth_services import (
    EmailAlreadyInUseError,
    authenticate_credentials,
    register_user,
)

User = get_user_model()


class UserManagerCreateUserTests(TestCase):
    def test_create_user_hashes_password(self) -> None:
        user = User.objects.create_user(
            email="alice@example.com",
            password="s3cret-pass",
            display_name="Alice",
        )
        self.assertNotEqual(user.password, "s3cret-pass")
        self.assertTrue(user.check_password("s3cret-pass"))

    def test_create_user_defaults_staff_and_superuser_to_false(self) -> None:
        user = User.objects.create_user(
            email="bob@example.com",
            password="hunter22ok",
            display_name="Bob",
        )
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_rejects_blank_email(self) -> None:
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email="",
                password="whatever-9k",
                display_name="Nobody",
            )


class UserManagerCreateSuperuserTests(TestCase):
    def test_create_superuser_sets_staff_and_superuser_true(self) -> None:
        admin = User.objects.create_superuser(
            email="root@example.com",
            password="rootpass-99",
            display_name="Root",
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password("rootpass-99"))


class UserEmailUniquenessTests(TestCase):
    def test_duplicate_email_raises_integrity_error(self) -> None:
        User.objects.create_user(
            email="dup@example.com",
            password="firstpass-1",
            display_name="First",
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(
                email="dup@example.com",
                password="secondpass-2",
                display_name="Second",
            )

    def test_duplicate_email_different_case_raises_integrity_error(self) -> None:
        User.objects.create_user(
            email="dup2@example.com",
            password="firstpass-1",
            display_name="First",
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(
                email="DUP2@example.com",
                password="secondpass-2",
                display_name="Second",
            )


class UserManagerEmailCanonicalizationTests(TestCase):
    def test_create_user_lowercases_full_email(self) -> None:
        user = User.objects.create_user(
            email="Alice@Example.com",
            password="s3cret-pass",
            display_name="Alice",
        )
        self.assertEqual(user.email, "alice@example.com")

    def test_create_user_strips_surrounding_whitespace(self) -> None:
        user = User.objects.create_user(
            email="  alice2@example.com  ",
            password="s3cret-pass",
            display_name="Alice",
        )
        self.assertEqual(user.email, "alice2@example.com")


class AuthenticateCredentialsTests(TestCase):
    def setUp(self) -> None:
        self.password = "correct-horse-99"
        self.user = User.objects.create_user(
            email="alice@example.com",
            password=self.password,
            display_name="Alice",
        )

    def test_authenticate_canonicalizes_email_at_lookup(self) -> None:
        result = authenticate_credentials("Alice@Example.com", self.password)
        self.assertIsNotNone(result)
        self.assertEqual(result.pk, self.user.pk)

    def test_authenticate_returns_none_on_wrong_password(self) -> None:
        result = authenticate_credentials("alice@example.com", "wrong-password")
        self.assertIsNone(result)

    def test_authenticate_returns_none_on_unknown_email(self) -> None:
        result = authenticate_credentials("nobody@example.com", "anything")
        self.assertIsNone(result)


class RegisterUserTests(TestCase):
    def test_register_user_happy_path(self) -> None:
        user = register_user("Bob@Example.com", "lighthouse-orbit", "Bob")
        self.assertEqual(user.email, "bob@example.com")
        self.assertTrue(user.check_password("lighthouse-orbit"))
        self.assertEqual(user.display_name, "Bob")

    def test_register_user_rejects_duplicate_email_any_case(self) -> None:
        register_user("dup-svc@example.com", "lighthouse-orbit", "First")
        with self.assertRaises(EmailAlreadyInUseError):
            register_user("DUP-SVC@example.com", "lighthouse-orbit", "Second")

    def test_register_user_rejects_weak_password(self) -> None:
        with self.assertRaises(ValidationError):
            register_user("weak@example.com", "abc", "Weak")


class AuthEndpointTests(TestCase):
    def setUp(self) -> None:
        self.password = "correct-horse-99"
        self.user = User.objects.create_user(
            email="alice@example.com",
            password=self.password,
            display_name="Alice",
        )
        # `enforce_csrf_checks=True` so the test client actually validates the
        # X-CSRFToken header — otherwise our "missing token gets rejected"
        # assertion would be a no-op.
        self.client = Client(enforce_csrf_checks=True)

    def _seed_csrf(self) -> str:
        """Hit GET /me so the CSRF cookie is set on the client, return token."""
        response = self.client.get("/api/auth/me")
        self.assertIn("csrftoken", response.cookies)
        return response.cookies["csrftoken"].value

    def test_login_success_returns_user_and_sets_session_cookie(self) -> None:
        csrf = self._seed_csrf()
        response = self.client.post(
            "/api/auth/login",
            data=json.dumps({"email": "alice@example.com", "password": self.password}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["email"], "alice@example.com")
        self.assertEqual(body["display_name"], "Alice")
        self.assertEqual(body["avatar_url"], "")
        self.assertIn("sessionid", response.cookies)
        # Follow-up GET /me should now be authenticated.
        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "alice@example.com")

    def test_login_with_mixed_case_email_succeeds(self) -> None:
        csrf = self._seed_csrf()
        response = self.client.post(
            "/api/auth/login",
            data=json.dumps({"email": "Alice@Example.com", "password": self.password}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("sessionid", response.cookies)

    def test_login_with_wrong_password_returns_401_and_no_session(self) -> None:
        csrf = self._seed_csrf()
        response = self.client.post(
            "/api/auth/login",
            data=json.dumps({"email": "alice@example.com", "password": "wrong"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Invalid email or password"})
        session_cookie = response.cookies.get("sessionid")
        # A fresh sessionid should not have been set on the failure branch.
        self.assertTrue(session_cookie is None or session_cookie.value == "")

    def test_login_without_csrf_header_is_rejected(self) -> None:
        # Seed the CSRF cookie but deliberately omit the matching header.
        self._seed_csrf()
        response = self.client.post(
            "/api/auth/login",
            data=json.dumps({"email": "alice@example.com", "password": self.password}),
            content_type="application/json",
        )
        self.assertGreaterEqual(response.status_code, 400)
        self.assertLess(response.status_code, 500)

    def test_me_unauthenticated_returns_401_and_sets_csrf_cookie(self) -> None:
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)
        self.assertIn("csrftoken", response.cookies)

    def test_me_authenticated_returns_user_and_sets_csrf_cookie(self) -> None:
        self.client.force_login(self.user)
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "alice@example.com")
        self.assertIn("csrftoken", response.cookies)


class SignupEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = Client(enforce_csrf_checks=True)

    def _seed_csrf(self) -> str:
        response = self.client.get("/api/auth/me")
        self.assertIn("csrftoken", response.cookies)
        return response.cookies["csrftoken"].value

    def _post_signup(self, payload: dict, csrf: str | None = None):
        kwargs = {
            "data": json.dumps(payload),
            "content_type": "application/json",
        }
        if csrf is not None:
            kwargs["HTTP_X_CSRFTOKEN"] = csrf
        return self.client.post("/api/auth/signup", **kwargs)

    def test_signup_success_returns_user_and_logs_in(self) -> None:
        csrf = self._seed_csrf()
        response = self._post_signup(
            {
                "email": "newbie@example.com",
                "password": "lighthouse-orbit",
                "display_name": "Newbie",
            },
            csrf=csrf,
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(
            set(body.keys()), {"id", "email", "display_name", "avatar_url"}
        )
        self.assertEqual(body["email"], "newbie@example.com")
        self.assertEqual(body["display_name"], "Newbie")
        self.assertEqual(body["avatar_url"], "")
        self.assertIn("sessionid", response.cookies)
        # Follow-up GET /me from the same client should be authenticated.
        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "newbie@example.com")

    def test_signup_duplicate_email_same_case_returns_field_error(self) -> None:
        User.objects.create_user(
            email="taken@example.com",
            password="lighthouse-orbit",
            display_name="Taken",
        )
        csrf = self._seed_csrf()
        response = self._post_signup(
            {
                "email": "taken@example.com",
                "password": "lighthouse-orbit",
                "display_name": "Other",
            },
            csrf=csrf,
        )
        self.assertEqual(response.status_code, 400)
        details = response.json()["detail"]
        self.assertTrue(
            any("email" in entry.get("loc", []) for entry in details),
            f"expected an `email` field-level error, got: {details!r}",
        )
        session_cookie = response.cookies.get("sessionid")
        self.assertTrue(session_cookie is None or session_cookie.value == "")

    def test_signup_duplicate_email_different_case_returns_field_error(self) -> None:
        User.objects.create_user(
            email="taken@example.com",
            password="lighthouse-orbit",
            display_name="Taken",
        )
        csrf = self._seed_csrf()
        response = self._post_signup(
            {
                "email": "TAKEN@example.com",
                "password": "lighthouse-orbit",
                "display_name": "Other",
            },
            csrf=csrf,
        )
        self.assertEqual(response.status_code, 400)
        details = response.json()["detail"]
        self.assertTrue(
            any("email" in entry.get("loc", []) for entry in details),
            f"expected an `email` field-level error, got: {details!r}",
        )

    def test_signup_weak_password_returns_field_error(self) -> None:
        csrf = self._seed_csrf()
        response = self._post_signup(
            {
                "email": "weak@example.com",
                "password": "abc",
                "display_name": "Weak",
            },
            csrf=csrf,
        )
        self.assertEqual(response.status_code, 400)
        details = response.json()["detail"]
        self.assertTrue(
            any("password" in entry.get("loc", []) for entry in details),
            f"expected a `password` field-level error, got: {details!r}",
        )

    def test_signup_allows_duplicate_display_name(self) -> None:
        csrf = self._seed_csrf()
        first = self._post_signup(
            {
                "email": "first@example.com",
                "password": "lighthouse-orbit",
                "display_name": "SameName",
            },
            csrf=csrf,
        )
        self.assertEqual(first.status_code, 200)
        # Drop the session cookie so the next request is anonymous; CSRF
        # rotates on login, so re-seed before posting again.
        self.client.cookies.pop("sessionid", None)
        csrf = self._seed_csrf()
        second = self._post_signup(
            {
                "email": "second@example.com",
                "password": "lighthouse-orbit",
                "display_name": "SameName",
            },
            csrf=csrf,
        )
        self.assertEqual(second.status_code, 200)
