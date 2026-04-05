from contextlib import asynccontextmanager
from datetime import date

import httpx
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db import get_conn, init_db

load_dotenv()

FINNHUB_BASE = "https://finnhub.io/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:3003",
        "http://localhost:3004",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
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


# all the safety for this function was AI generated
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
    """One stored row: date, signed price, explanation, and category label."""

    item_date: str = Field(..., description="ISO date YYYY-MM-DD")
    price: float
    comment: str = Field(default="", max_length=4000)
    category: str = Field(default="other", max_length=200)


class BulkLedgerIn(BaseModel):
    items: list[LedgerItemIn] = Field(default_factory=list)


@app.get("/db/items")
def list_ledger_items():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT id, item_date, price, comment, category, created_at
            FROM ledger_items
            ORDER BY item_date DESC, id DESC
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
    category = (body.category or "other").strip() or "other"
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO ledger_items (item_date, price, comment, category)
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
        cat = (it.category or "other").strip() or "other"
        normalized.append((d, float(it.price), it.comment.strip(), cat))
    with get_conn() as conn:
        conn.executemany(
            """
            INSERT INTO ledger_items (item_date, price, comment, category)
            VALUES (?, ?, ?, ?)
            """,
            normalized,
        )
        conn.commit()
    return {"inserted": len(normalized)}


@app.get("/db/items/summary/monthly")
def monthly_ledger_summary():
    """Per calendar month: sum of positive prices (income), sum of abs(negative) (expenses), net = sum of all signed prices."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT
              strftime('%Y-%m', item_date) AS month,
              SUM(CASE WHEN price > 0 THEN price ELSE 0 END) AS income,
              SUM(CASE WHEN price < 0 THEN -price ELSE 0 END) AS expenses,
              SUM(price) AS net
            FROM ledger_items
            GROUP BY strftime('%Y-%m', item_date)
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
    """Per calendar month and category: income, expenses (abs of negatives), net."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT
              strftime('%Y-%m', item_date) AS month,
              category,
              SUM(CASE WHEN price > 0 THEN price ELSE 0 END) AS income,
              SUM(CASE WHEN price < 0 THEN -price ELSE 0 END) AS expenses,
              SUM(price) AS net
            FROM ledger_items
            GROUP BY strftime('%Y-%m', item_date), category
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
