from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

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
