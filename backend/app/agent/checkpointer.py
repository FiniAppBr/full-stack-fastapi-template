"""
PostgreSQL Checkpointer for LangGraph state persistence.

Uses PostgresSaver from langgraph for automatic state checkpointing.
Every graph step is persisted, enabling:
- Conversation resumption across sessions
- State history/replay
- Debugging via checkpoint inspection
"""
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool

from app.core.config import settings

_connection_pool = None
_checkpointer = None
_checkpointer_ready = False


def _init_checkpointer_at_startup() -> None:
    """
    Initialize checkpointer tables at module load.
    Must run BEFORE any database transactions are opened.
    CREATE INDEX CONCURRENTLY waits for all transactions to complete.
    """
    global _connection_pool, _checkpointer, _checkpointer_ready

    if _checkpointer_ready:
        return

    import psycopg
    from psycopg.rows import dict_row
    from langgraph.checkpoint.postgres.base import MIGRATIONS

    connection_string = (
        f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )

    print("Initializing checkpointer tables...")

    with psycopg.connect(connection_string, autocommit=True, row_factory=dict_row) as conn:
        conn.execute(MIGRATIONS[0])

        result = conn.execute("SELECT v FROM checkpoint_migrations ORDER BY v DESC LIMIT 1")
        row = result.fetchone()
        version = row["v"] if row else -1

        print(f"  Current checkpoint migration version: {version}")

        for v in range(version + 1, len(MIGRATIONS)):
            migration = MIGRATIONS[v]
            print(f"  Running migration {v}: {migration[:60]}...")
            conn.execute(migration)
            conn.execute(f"INSERT INTO checkpoint_migrations (v) VALUES ({v})")

        if version < len(MIGRATIONS) - 1:
            print(f"  Migrations complete (now at version {len(MIGRATIONS) - 1})")
        else:
            print(f"  Tables already at version {version}")

    _connection_pool = ConnectionPool(
        conninfo=connection_string,
        min_size=1,
        max_size=10,
        open=True
    )
    _checkpointer = PostgresSaver(conn=_connection_pool)
    _checkpointer_ready = True
    print("Checkpointer initialized")


# Initialize at module load
try:
    _init_checkpointer_at_startup()
except Exception as e:
    print(f"WARNING: Checkpointer init failed: {e}")


def get_checkpointer() -> PostgresSaver:
    """Get the PostgreSQL checkpointer (initialized at startup)."""
    if not _checkpointer_ready or _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Check startup logs.")
    return _checkpointer
