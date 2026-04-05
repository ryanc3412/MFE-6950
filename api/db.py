import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

# Docker Compose sets SQLITE_PATH=/app/data/demo.db; local dev uses ./data under api/
_DEFAULT_DB = Path(__file__).resolve().parent / "data" / "demo.db"


def get_db_path() -> str:
    return os.environ.get("SQLITE_PATH", str(_DEFAULT_DB))


def _ensure_category_column(conn: sqlite3.Connection) -> None:
    cur = conn.execute("PRAGMA table_info(ledger_items)")
    names = {row[1] for row in cur.fetchall()}
    if "category" not in names:
        conn.execute(
            "ALTER TABLE ledger_items ADD COLUMN category TEXT NOT NULL DEFAULT 'other'"
        )


def init_db() -> None:
    path = Path(get_db_path())
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ledger_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_date TEXT NOT NULL,
                price REAL NOT NULL,
                comment TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'other',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()
        _ensure_category_column(conn)
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(get_db_path())
    try:
        yield conn
    finally:
        conn.close()
