from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

FINNHUB_BASE = "https://finnhub.io/api/v1"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3003",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
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
