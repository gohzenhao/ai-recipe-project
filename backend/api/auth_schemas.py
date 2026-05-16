from __future__ import annotations

from ninja import Schema


class UserOut(Schema):
    id: int
    email: str
    display_name: str
    avatar_url: str


class LoginIn(Schema):
    email: str
    password: str


class SignupIn(Schema):
    email: str
    password: str
    display_name: str
