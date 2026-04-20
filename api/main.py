from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date
import os
import sqlite3

import httpx
import finnhub
from dotenv import load_dotenv
from finnhub.exceptions import FinnhubAPIException
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from categorize import ALLOWED_CATEGORIES, categorize_with_openai, normalize_category
from db import BUCKETS, get_conn, init_db
from finance_csv import parse_financial_csv_text

load_dotenv()

FINNHUB_BASE = "https://finnhub.io/api/v1"

_DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://localhost:3004",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

_extra_origins = [
    o.strip()
    for o in (os.environ.get("CORS_ORIGINS") or "").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(_DEFAULT_ORIGINS + _extra_origins)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/square")
def square(n: str = Query(...)):
    try:
        num = float(n)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Missing or invalid query parameter: n",
        )
    if num == int(num):
        num = int(num)
    return {"number": num, "square": num * num}


@app.get("/stock")
def stock(symbol: str = Query(..., description="Stock ticker symbol (e.g. AAPL)")):
    token = (os.environ.get("FINNHUB_API_KEY") or "").strip()
    if not token or token == "your_finnhub_api_key_here":
        raise HTTPException(
            status_code=500,
            detail="FINNHUB_API_KEY is not set or still the placeholder. Copy api/.env.example to api/.env and add your key from https://finnhub.io/register",
        )
    sym = symbol.strip().upper()
    if not sym:
        raise HTTPException(
            status_code=400,
            detail="Please provide a 'symbol' query param (e.g. AAPL).",
        )
    params = {"symbol": sym, "token": token}
    try:
        with httpx.Client(timeout=10.0) as client:
            quote_res = client.get(f"{FINNHUB_BASE}/quote", params=params)
            profile_res = client.get(f"{FINNHUB_BASE}/stock/profile2", params=params)
        quote_res.raise_for_status()
        quote = quote_res.json()
        profile = profile_res.json() if profile_res.is_success else None
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(
                status_code=502,
                detail="Invalid Finnhub API key. Check FINNHUB_API_KEY in api/.env and get a key at https://finnhub.io/register",
            ) from e
        raise HTTPException(
            status_code=502,
            detail=f"Finnhub returned {e.response.status_code}. Try again later.",
        ) from e
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail="Could not reach Finnhub. Check your network.",
        ) from e

    price = quote.get("c")
    if price is None or not isinstance(price, (int, float)):
        raise HTTPException(
            status_code=404,
            detail="Quote not found for this symbol.",
        )
    name = None
    if profile and isinstance(profile.get("name"), str):
        name = profile["name"]
    return {"symbol": sym, "name": name, "price": float(price)}


def _normalize_item_date(raw: str) -> str:
    s = raw.strip()
    try:
        date.fromisoformat(s)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail="item_date must be a calendar date in YYYY-MM-DD form.",
        ) from e
    return s


class LedgerItemIn(BaseModel):
    item_date: str = Field(..., description="ISO date YYYY-MM-DD")
    price: float
    comment: str = Field(default="", max_length=4000)
    category: str = Field(default="other", max_length=200)


class BulkLedgerIn(BaseModel):
    items: list[LedgerItemIn] = Field(default_factory=list)


class BulkDeleteTransactionsIn(BaseModel):
    ids: list[int] = Field(
        default_factory=list,
        description="Primary keys of transactions rows to delete.",
    )


# --- Hierarchical wealth (sub-accounts under3 buckets) ---

_BUCKET_LABELS = {
    "checking": "Checking",
    "stock_market": "Stock Market",
    "retirement": "Retirement",
}


def _validate_bucket(bucket: str) -> str:
    b = bucket.strip().lower()
    if b not in BUCKETS:
        raise HTTPException(
            status_code=400,
            detail=f"bucket must be one of: {', '.join(BUCKETS)}",
        )
    return b


class SubAccountCreate(BaseModel):
    bucket: str = Field(..., description="checking | stock_market | retirement")
    name: str = Field(..., min_length=1, max_length=200)


class SubAccountPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    balance: float | None = None


@app.get("/wealth/hierarchy")
def wealth_hierarchy():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT id, bucket, name, balance, sort_order, created_at, updated_at
            FROM sub_accounts
            ORDER BY bucket ASC, sort_order ASC, id ASC
            """
        )
        rows = cur.fetchall()
    by_bucket: dict[str, list[dict]] = {b: [] for b in BUCKETS}
    totals: dict[str, float] = {b: 0.0 for b in BUCKETS}
    grand = 0.0
    for r in rows:
        bid, bucket, name, balance, sort_order, created_at, updated_at = (
            r[0],
            r[1],
            r[2],
            float(r[3] or 0),
            r[4],
            r[5],
            r[6],
        )
        item = {
            "id": bid,
            "name": name,
            "balance": balance,
            "sort_order": sort_order,
            "created_at": created_at,
            "updated_at": updated_at,
        }
        by_bucket[bucket].append(item)
        totals[bucket] += balance
        grand += balance
    buckets_out = [
        {
            "bucket": b,
            "label": _BUCKET_LABELS[b],
            "total": totals[b],
            "sub_accounts": by_bucket[b],
        }
        for b in BUCKETS
    ]
    return {
        "grand_total": grand,
        "bucket_totals": {
            "checking": totals["checking"],
            "stock_market": totals["stock_market"],
            "retirement": totals["retirement"],
        },
        "buckets": buckets_out,
    }


@app.post("/wealth/sub-accounts")
def create_sub_account(body: SubAccountCreate):
    bucket = _validate_bucket(body.bucket)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required.")
    with get_conn() as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO sub_accounts (bucket, name, balance)
                VALUES (?, ?, 0)
                """,
                (bucket, name),
            )
            conn.commit()
            new_id = cur.lastrowid
        except sqlite3.IntegrityError as e:
            raise HTTPException(
                status_code=409,
                detail="A sub-account with this name already exists in that bucket.",
            ) from e
    return {"id": new_id, "bucket": bucket, "name": name, "balance": 0.0}


@app.patch("/wealth/sub-accounts/{sub_id}")
def patch_sub_account(sub_id: int, body: SubAccountPatch):
    set_parts: list[str] = []
    params: list = []
    if body.name is not None:
        n = body.name.strip()
        if not n:
            raise HTTPException(status_code=400, detail="name cannot be empty.")
        set_parts.append("name = ?")
        params.append(n)
    if body.balance is not None:
        set_parts.append("balance = ?")
        params.append(float(body.balance))
    if not set_parts:
        raise HTTPException(status_code=400, detail="No fields to update.")
    set_parts.append("updated_at = datetime('now')")
    params.append(sub_id)
    with get_conn() as conn:
        try:
            cur = conn.execute(
                f"UPDATE sub_accounts SET {', '.join(set_parts)} WHERE id = ?",
                params,
            )
        except sqlite3.IntegrityError as e:
            raise HTTPException(
                status_code=409,
                detail="Name conflict in this bucket.",
            ) from e
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sub-account not found.")
        conn.commit()
    return {"id": sub_id, "updated": True}


@app.delete("/wealth/sub-accounts/{sub_id}")
def delete_sub_account(sub_id: int):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM sub_accounts WHERE id = ?", (sub_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sub-account not found.")
    return {"deleted": sub_id}


# Legacy aggregate (flat) for older clients: maps stock_market → "savings" kind
@app.get("/accounts")
def list_accounts_legacy():
    data = wealth_hierarchy()
    bt = data["bucket_totals"]
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT MAX(updated_at) FROM sub_accounts",
        )
        row = cur.fetchone()
    u = row[0] if row and row[0] else ""
    return {
        "accounts": [
            {
                "kind": "checking",
                "balance": bt["checking"],
                "updated_at": u,
            },
            {
                "kind": "savings",
                "balance": bt["stock_market"],
                "updated_at": u,
            },
            {
                "kind": "retirement",
                "balance": bt["retirement"],
                "updated_at": u,
            },
        ]
    }


# --- Stocks watchlist ---


class StockIn(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=16)


@app.get("/stocks")
def list_stocks():
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT symbol, created_at FROM stocks ORDER BY symbol ASC"
        )
        rows = cur.fetchall()
    return {"symbols": [{"symbol": r[0], "created_at": r[1]} for r in rows]}


@app.post("/stocks")
def add_stock(body: StockIn):
    sym = body.symbol.strip().upper()
    if not sym or not sym.replace(".", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid symbol.")
    with get_conn() as conn:
        cur = conn.execute("SELECT 1 FROM stocks WHERE symbol = ?", (sym,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Symbol already on watchlist.")
        conn.execute(
            "INSERT INTO stocks (symbol) VALUES (?)",
            (sym,),
        )
        conn.commit()
    return {"symbol": sym}


@app.delete("/stocks/{symbol}")
def remove_stock(symbol: str):
    sym = symbol.strip().upper()
    with get_conn() as conn:
        conn.execute("DELETE FROM stocks WHERE symbol = ?", (sym,))
        conn.commit()
    return {"removed": sym}


def _finnhub_token_or_none() -> str | None:
    t = (os.environ.get("FINNHUB_API_KEY") or "").strip()
    if not t or t == "your_finnhub_api_key_here":
        return None
    return t


def _stock_quote_rows_from_db() -> list[tuple]:
    """Each row: symbol, last_price, last_pct_change."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT symbol, last_price, last_pct_change
            FROM stocks
            ORDER BY symbol ASC
            """
        )
        return list(cur.fetchall())


def _rows_to_quote_payload(rows: list[tuple]) -> list[dict]:
    out: list[dict] = []
    for r in rows:
        sym, lp, dp = r[0], r[1], r[2]
        out.append(
            {
                "symbol": sym,
                "current_price": float(lp) if lp is not None else None,
                "percent_change": float(dp) if dp is not None else None,
            }
        )
    return out


@app.get("/api/market/quotes")
@app.get("/market/quotes")
def market_quotes():
    """
    Live quotes for watchlist symbols (Finnhub). Caches last price / % change in SQLite.
    On Finnhub 429, returns the last cached snapshot without partial updates.
    """
    rows = _stock_quote_rows_from_db()
    if not rows:
        return {"quotes": [], "stale": False}

    initial_snapshot = _rows_to_quote_payload(rows)
    token = _finnhub_token_or_none()
    if token is None:
        return {"quotes": initial_snapshot, "stale": True}

    client = finnhub.Client(api_key=token)
    pending: list[tuple[float, float, str]] = []

    for r in rows:
        sym = r[0]
        try:
            q = client.quote(sym)
        except FinnhubAPIException as e:
            if getattr(e, "status_code", None) == 429:
                return {"quotes": initial_snapshot, "stale": True}
            continue
        except Exception:
            continue
        if not q or not isinstance(q, dict):
            continue
        c = q.get("c")
        if c is None or not isinstance(c, (int, float)):
            continue
        price = float(c)
        dp_raw = q.get("dp")
        if dp_raw is None or not isinstance(dp_raw, (int, float)):
            dp = 0.0
        else:
            dp = float(dp_raw)
        pending.append((price, dp, sym))

    if pending:
        with get_conn() as conn:
            for price, dp, sym in pending:
                conn.execute(
                    """
                    UPDATE stocks
                    SET last_price = ?,
                        last_pct_change = ?,
                        last_quote_at = datetime('now')
                    WHERE symbol = ?
                    """,
                    (price, dp, sym),
                )
            conn.commit()

    fresh = _stock_quote_rows_from_db()
    return {"quotes": _rows_to_quote_payload(fresh), "stale": False}


# --- Transactions (primary store); /db/items kept for existing UI helpers ---


@app.post("/transactions/upload")
async def upload_transactions_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a .csv file.")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    parsed = parse_financial_csv_text(text)
    if not parsed:
        raise HTTPException(
            status_code=400,
            detail="No valid rows. Expected columns: date, amount, (ignored), category, description.",
        )
    descriptions = [p.description for p in parsed]
    bank_cats = [p.bank_category for p in parsed]
    categories = categorize_with_openai(descriptions, bank_cats)
    tuples = [
        (
            pr.item_date,
            pr.amount,
            pr.description,
            categories[i],
            pr.bank_category,
        )
        for i, pr in enumerate(parsed)
    ]
    with get_conn() as conn:
        conn.executemany(
            """
            INSERT INTO transactions (txn_date, amount, description, category, bank_category)
            VALUES (?, ?, ?, ?, ?)
            """,
            tuples,
        )
        conn.commit()
    return {"inserted": len(tuples), "filename": file.filename}


def _execute_bulk_delete(body: BulkDeleteTransactionsIn) -> dict:
    """Shared implementation for bulk delete endpoints."""
    if not body.ids:
        return {"deleted": 0}
    if len(body.ids) > 10_000:
        raise HTTPException(
            status_code=400,
            detail="Too many ids in one request (max 10000).",
        )
    unique: list[int] = []
    seen: set[int] = set()
    for raw in body.ids:
        try:
            i = int(raw)
        except (TypeError, ValueError):
            continue
        if i < 1 or i in seen:
            continue
        seen.add(i)
        unique.append(i)
    if not unique:
        if body.ids:
            raise HTTPException(
                status_code=400,
                detail="No valid positive integer transaction ids in request.",
            )
        return {"deleted": 0}
    placeholders = ",".join("?" * len(unique))
    with get_conn() as conn:
        cur = conn.execute(
            f"DELETE FROM transactions WHERE id IN ({placeholders})",
            unique,
        )
        conn.commit()
        deleted = cur.rowcount
    return {"deleted": deleted}


@app.post("/transactions/delete-bulk")
def delete_transactions_bulk(body: BulkDeleteTransactionsIn):
    """Delete many transaction rows in one round-trip (SQLite `WHERE id IN (...)`)."""
    return _execute_bulk_delete(body)


@app.post("/api/transactions/bulk-delete")
def api_delete_transactions_bulk(body: BulkDeleteTransactionsIn):
    """Alias for clients expecting an `/api/...` path (no global API prefix on this app)."""
    return _execute_bulk_delete(body)


def _delete_transaction_by_id(transaction_id: int) -> dict:
    if transaction_id < 1:
        raise HTTPException(
            status_code=400,
            detail="Invalid transaction id.",
        )
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM transactions WHERE id = ?",
            (transaction_id,),
        )
        conn.commit()
        deleted = cur.rowcount
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return {"deleted": transaction_id}


@app.delete("/api/transactions/{transaction_id}")
def api_delete_transaction(transaction_id: int):
    """Delete a single ledger row by primary key."""
    return _delete_transaction_by_id(transaction_id)


@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    """Same as `/api/transactions/{id}` for clients using the non-`/api` prefix."""
    return _delete_transaction_by_id(transaction_id)


@app.get("/transactions/spending-over-time")
def spending_over_time():
    """Monthly total spending (sum of negative amounts as positive expense)."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT
              strftime('%Y-%m', txn_date) AS month,
              SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS spending
            FROM transactions
            GROUP BY strftime('%Y-%m', txn_date)
            ORDER BY month ASC
            """
        )
        rows = cur.fetchall()
    return {
        "points": [
            {"period": r[0], "spending": float(r[1] or 0)} for r in rows ]
    }


@app.get("/transactions/monthly-matrix")
def monthly_spending_matrix(
    year: int | None = Query(
        None,
        ge=2000,
        le=2100,
        description="Calendar year for the 12-month grid (defaults to latest year in data, else current year).",
    ),
):
    """
    Pivot: categories (rows) × 12 calendar months (columns) for one reporting year.
    Outflows (negative amounts) summed as positive spend, same rule as spending-over-time.
    """
    spend_sql = "CASE WHEN amount < 0 THEN -amount ELSE 0 END"
    with get_conn() as conn:
        cur = conn.execute(
            f"""
            SELECT category, strftime('%Y-%m', txn_date) AS month,
                   SUM({spend_sql}) AS spend
            FROM transactions
            GROUP BY category, strftime('%Y-%m', txn_date)
            """
        )
        raw = cur.fetchall()

    from collections import defaultdict

    years_in_data: set[int] = set()
    for _cat, month, _spend in raw:
        mkey = str(month)
        if len(mkey) >= 7 and mkey[4] == "-":
            years_in_data.add(int(mkey[0:4]))

    if year is not None:
        report_year = year
    elif years_in_data:
        report_year = max(years_in_data)
    else:
        report_year = date.today().year

    months = [f"{report_year}-{m:02d}" for m in range(1, 13)]
    zero_row = [0.0] * 12

    if not raw:
        return {
            "report_year": report_year,
            "months": months,
            "categories": [],
            "matrix": [],
            "row_totals": [],
            "column_totals": list(zero_row),
            "grand_total": 0.0,
        }

    prefix = f"{report_year}-"
    categories_set: set[str] = set()
    cells: dict[tuple[str, str], float] = defaultdict(float)
    for cat, month, spend in raw:
        mkey = str(month)
        if not mkey.startswith(prefix):
            continue
        categories_set.add(str(cat))
        cells[(str(cat), mkey)] += float(spend or 0)

    if not categories_set:
        return {
            "report_year": report_year,
            "months": months,
            "categories": [],
            "matrix": [],
            "row_totals": [],
            "column_totals": list(zero_row),
            "grand_total": 0.0,
        }

    categories = sorted(categories_set, key=str.casefold)

    matrix: list[list[float]] = []
    row_totals: list[float] = []
    for cat in categories:
        row = [float(cells[(cat, mo)]) for mo in months]
        matrix.append(row)
        row_totals.append(sum(row))

    column_totals: list[float] = []
    for j in range(12):
        column_totals.append(sum(matrix[i][j] for i in range(len(categories))))

    grand_total = sum(row_totals)
    return {
        "report_year": report_year,
        "months": months,
        "categories": categories,
        "matrix": matrix,
        "row_totals": row_totals,
        "column_totals": column_totals,
        "grand_total": float(grand_total),
    }


@app.get("/db/items")
def list_ledger_items():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT id, txn_date, amount, description, category, created_at
            FROM transactions
            ORDER BY txn_date DESC, id DESC
            """
        )
        rows = cur.fetchall()
    return {
        "items": [
            {
                "id": r[0],
                "item_date": r[1],
                "price": r[2],
                "comment": r[3],
                "category": r[4],
                "created_at": r[5],
            }
            for r in rows
        ]
    }


@app.post("/db/items")
def create_ledger_item(body: LedgerItemIn):
    item_date = _normalize_item_date(body.item_date)
    comment = body.comment.strip()
    category = normalize_category(body.category or "other")
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO transactions (txn_date, amount, description, category)
            VALUES (?, ?, ?, ?)
            """,
            (item_date, body.price, comment, category),
        )
        conn.commit()
        new_id = cur.lastrowid
    return {
        "id": new_id,
        "item_date": item_date,
        "price": body.price,
        "comment": comment,
        "category": category,
    }


@app.post("/db/items/bulk")
def bulk_create_ledger_items(body: BulkLedgerIn):
    if len(body.items) > 50_000:
        raise HTTPException(
            status_code=400,
            detail="Too many rows in one request (max 50000).",
        )
    if not body.items:
        return {"inserted": 0}
    normalized: list[tuple[str, float, str, str]] = []
    for it in body.items:
        d = _normalize_item_date(it.item_date)
        cat = normalize_category(it.category or "other")
        normalized.append((d, float(it.price), it.comment.strip(), cat))
    with get_conn() as conn:
        conn.executemany(
            """
            INSERT INTO transactions (txn_date, amount, description, category)
            VALUES (?, ?, ?, ?)
            """,
            normalized,
        )
        conn.commit()
    return {"inserted": len(normalized)}


@app.get("/db/items/summary/monthly")
def monthly_ledger_summary():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT
              strftime('%Y-%m', txn_date) AS month,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS expenses,
              SUM(amount) AS net
            FROM transactions
            GROUP BY strftime('%Y-%m', txn_date)
            ORDER BY month DESC
            """
        )
        rows = cur.fetchall()
    return {
        "months": [
            {
                "month": r[0],
                "income": float(r[1] or 0),
                "expenses": float(r[2] or 0),
                "net": float(r[3] or 0),
            }
            for r in rows
        ]
    }


@app.get("/db/items/summary/monthly-by-category")
def monthly_by_category_summary():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT
              strftime('%Y-%m', txn_date) AS month,
              category,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS expenses,
              SUM(amount) AS net
            FROM transactions
            GROUP BY strftime('%Y-%m', txn_date), category
            ORDER BY month DESC, category ASC
            """
        )
        rows = cur.fetchall()
    return {
        "rows": [
            {
                "month": r[0],
                "category": r[1],
                "income": float(r[2] or 0),
                "expenses": float(r[3] or 0),
                "net": float(r[4] or 0),
            }
            for r in rows
        ]
    }


@app.get("/meta/categories")
def meta_categories():
    return {"categories": list(ALLOWED_CATEGORIES)}
