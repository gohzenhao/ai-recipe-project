"""Custom test runner that survives Neon's pooler holding the test DB open.

Django's default DROP DATABASE fails on Neon because PgBouncer keeps idle
sessions to the test database alive across connection close. We replace the
DROP with `DROP DATABASE ... WITH (FORCE)` (PostgreSQL 13+) which terminates
those sessions atomically.
"""

from __future__ import annotations

from django.db import connections
from django.test.runner import DiscoverRunner


class NeonDiscoverRunner(DiscoverRunner):
    def teardown_databases(self, old_config, **kwargs):  # type: ignore[override]
        for connection, _, _ in old_config:
            creation = connection.creation

            def _force_destroy(
                test_database_name: str,
                verbosity: int,
                _creation=creation,
            ) -> None:
                with _creation._nodb_cursor() as cursor:
                    quoted = _creation.connection.ops.quote_name(test_database_name)
                    cursor.execute(f"DROP DATABASE IF EXISTS {quoted} WITH (FORCE)")

            creation._destroy_test_db = _force_destroy
            connections[connection.alias] = connection
        super().teardown_databases(old_config, **kwargs)
