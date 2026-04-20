import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

_DEFAULT_DB = Path(__file__).resolve().parent / "data" / "demo.db"

BUCKETS = ("checking", "stock_market", "retirement")

_DEFAULT_SUB_ACCOUNTS: tuple[tuple[str, str, float], ...] = (
    ("checking", "Main checking", 0),
    ("checking", "Joint account", 0),
    ("stock_market", "Personal brokerage", 0),
    ("stock_market", "Crypto", 0),
    ("stock_market", "401(k)", 0),
    ("retirement", "My Roth IRA", 0),
    ("retirement", "Wife's Roth IRA", 0),
    ("retirement", "HSA", 0),
)


def get_db_path() -> str:
    return os.environ.get("SQLITE_PATH", str(_DEFAULT_DB))


def configure_sqlite(conn: sqlite3.Connection) -> None:
    """WAL + NORMAL sync improves durability across crashes; busy_timeout avoids hot-reload lock errors.
    WAL is skipped if the DB directory is not writable (e.g. some CI sandboxes)."""
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("PRAGMA synchronous=NORMAL")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("PRAGMA busy_timeout=5000")
    except sqlite3.OperationalError:
        pass


def _ensure_category_column(conn: sqlite3.Connection) -> None:
    cur = conn.execute("PRAGMA table_info(ledger_items)")
    names = {row[1] for row in cur.fetchall()}
    if "category" not in names and names:
        conn.execute(
            "ALTER TABLE ledger_items ADD COLUMN category TEXT NOT NULL DEFAULT 'other'"
        )


def _migrate_ledger_to_transactions(conn: sqlite3.Connection) -> None:
    cur = conn.execute("SELECT COUNT(*) FROM transactions")
    if cur.fetchone()[0] > 0:
        return
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ledger_items'"
    )
    if not cur.fetchone():
        return
    conn.execute(
        """
        INSERT INTO transactions (txn_date, amount, description, category, bank_category, created_at)
        SELECT item_date, price, comment, category, '', created_at
        FROM ledger_items
        """
    )


def _seed_legacy_accounts(conn: sqlite3.Connection) -> None:
    for kind in ("checking", "savings", "retirement"):
        conn.execute(
            """
            INSERT OR IGNORE INTO accounts (kind, balance)
            VALUES (?, 0)
            """,
            (kind,),
        )


def _insert_default_sub_accounts(conn: sqlite3.Connection) -> None:
    for bucket, name, bal in _DEFAULT_SUB_ACCOUNTS:
        conn.execute(
            """
            INSERT INTO sub_accounts (bucket, name, balance)
            VALUES (?, ?, ?)
            """,
            (bucket, name, bal),
        )


def _ensure_stock_quote_columns(conn: sqlite3.Connection) -> None:
    """Cache last Finnhub quote per symbol for 429 / offline fallback."""
    cur = conn.execute("PRAGMA table_info(stocks)")
    names = {row[1] for row in cur.fetchall()}
    if "last_price" not in names:
        conn.execute("ALTER TABLE stocks ADD COLUMN last_price REAL")
    if "last_pct_change" not in names:
        conn.execute("ALTER TABLE stocks ADD COLUMN last_pct_change REAL")
    if "last_quote_at" not in names:
        conn.execute(
            "ALTER TABLE stocks ADD COLUMN last_quote_at TEXT"
        )


def _migrate_legacy_accounts_to_sub_accounts(conn: sqlite3.Connection) -> None:
    cur = conn.execute("SELECT COUNT(*) FROM sub_accounts")
    if cur.fetchone()[0] > 0:
        return
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
    )
    if not cur.fetchone():
        _insert_default_sub_accounts(conn)
        return
    rows = conn.execute("SELECT kind, balance FROM accounts").fetchall()
    if not rows:
        _insert_default_sub_accounts(conn)
        return
    total_bal = sum(float(b or 0) for _, b in rows)
    # Fresh demo DB: seeded flat accounts at $0 → use full hierarchical defaults.
    if total_bal == 0 and len(rows) <= 3:
        _insert_default_sub_accounts(conn)
        return
    labels = {
        "checking": "Primary checking",
        "savings": "Stock market (migrated)",
        "retirement": "Primary retirement",
    }
    for kind, balance in rows:
        if kind == "checking":
            bucket = "checking"
        elif kind == "savings":
            bucket = "stock_market"
        elif kind == "retirement":
            bucket = "retirement"
        else:
            continue
        conn.execute(
            """
            INSERT INTO sub_accounts (bucket, name, balance)
            VALUES (?, ?, ?)
            """,
            (bucket, labels.get(kind, "Account"), float(balance or 0)),
        )


def init_db() -> None:
    path = Path(get_db_path())
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        configure_sqlite(conn)
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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL UNIQUE,
                balance REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sub_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bucket TEXT NOT NULL CHECK (bucket IN ('checking', 'stock_market', 'retirement')),
                name TEXT NOT NULL,
                balance REAL NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_accounts_bucket_name
            ON sub_accounts(bucket, name)
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_date TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'other',
                bank_category TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS stocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        _ensure_stock_quote_columns(conn)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (txn_date)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sub_accounts_bucket ON sub_accounts(bucket)"
        )
        _ensure_category_column(conn)
        _migrate_ledger_to_transactions(conn)
        _seed_legacy_accounts(conn)
        _migrate_legacy_accounts_to_sub_accounts(conn)
        _migrate_transaction_category_titles(conn)
        conn.commit()


_CATEGORY_TITLE_MIGRATION_VER = 1


def _migrate_transaction_category_titles(conn: sqlite3.Connection) -> None:
    """Title-case categories so 'eating out' and 'Eating Out' merge; runs once per DB."""
    row = conn.execute("PRAGMA user_version").fetchone()
    if row and row[0] >= _CATEGORY_TITLE_MIGRATION_VER:
        return

    from categorize import normalize_category

    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ledger_items'"
    )
    if cur.fetchone():
        rows = conn.execute("SELECT id, category FROM ledger_items").fetchall()
        for rid, cat in rows:
            new_c = normalize_category(str(cat))
            if new_c != cat:
                conn.execute(
                    "UPDATE ledger_items SET category = ? WHERE id = ?",
                    (new_c, rid),
                )

    rows = conn.execute("SELECT id, category FROM transactions").fetchall()
    for rid, cat in rows:
        new_c = normalize_category(str(cat))
        if new_c != cat:
            conn.execute(
                "UPDATE transactions SET category = ? WHERE id = ?",
                (new_c, rid),
            )

    conn.execute(f"PRAGMA user_version = {_CATEGORY_TITLE_MIGRATION_VER}")


@contextmanager
def get_conn():
    conn = sqlite3.connect(get_db_path())
    configure_sqlite(conn)
    try:
        yield conn
    finally:
        conn.close()
