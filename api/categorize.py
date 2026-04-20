"""LLM + fallback categorization for finance transactions."""

from __future__ import annotations

import json
import os
import re
from typing import Sequence

# Title-case labels the model must return exactly (one per transaction).
ALLOWED_CATEGORIES: tuple[str, ...] = (
    "Car Insurance",
    "Car Payment",
    "Car - Other",
    "Cash Out",
    "Church",
    "Eating Out",
    "Fun",
    "Gas",
    "Gifts",
    "Groceries",
    "House Payment",
    "Housing",
    "Income",
    "Insurance",
    "Medical",
    "Other",
    "Personal",
    "Phone",
    "Rent",
    "Rentals",
    "Salary",
    "School",
    "Stocks",
    "Subscription",
    "Utilities",
    "Vacation",
)

_ALLOWED_SLUGS = frozenset(a.lower() for a in ALLOWED_CATEGORIES)

_SLUG_ALIASES: dict[str, str] = {
    "car-insurance": "car insurance",
    "car insurance": "car insurance",
    "car payment": "car payment",
    "car - other": "car - other",
    "car other": "car - other",
    "car-other": "car - other",
    "eatingout": "eating out",
    "eat out": "eating out",
    "house payment": "house payment",
    "subscription": "subscription",
    "cashout": "cash out",
    "cash out": "cash out",
}

_FREEFORM_SLUG = re.compile(r"^[a-z0-9]+(?:[\s\-][a-z0-9]+)*$")


def display_from_slug(slug: str) -> str:
    """Title-case each word; preserve ' - ' segments (e.g. Car - Other)."""
    s = (slug or "").strip()
    if not s:
        return "Other"
    if " - " in s:
        return " - ".join(display_from_slug(p.strip()) for p in s.split(" - "))
    return " ".join(p.capitalize() for p in s.split())


def slugify_category(raw: str) -> str:
    """
    Map any user/LLM/legacy string to a lowercase canonical slug.
    Known labels match ALLOWED_CATEGORIES; sensible multi-word strings pass through;
    junk maps to 'other'.
    """
    t = (raw or "").strip().lower()
    t = t.replace("—", "-").replace("–", "-")
    t = _SLUG_ALIASES.get(t, t)
    for allowed in ALLOWED_CATEGORIES:
        if allowed.lower() == t:
            return allowed.lower()
    if t == "other" or t == "":
        return "other"
    if _FREEFORM_SLUG.fullmatch(t):
        return t
    return "other"


def normalize_category(raw: str) -> str:
    """Public: DB storage, API responses, CSV pipeline — always title-cased per word."""
    return display_from_slug(slugify_category(raw))


def _fallback_slug(description: str, bank_category: str) -> str:
    bc = (bank_category or "").strip().lower()
    desc = (description or "").lower()
    bank_map = {
        "groceries": "groceries",
        "eating out": "eating out",
        "gas": "gas",
        "phone": "phone",
        "church": "church",
        "housing": "housing",
        "personal": "personal",
        "work": "other",
        "subscription": "subscription",
        "vacation": "vacation",
    }
    if bc in bank_map:
        return bank_map[bc]
    if "payroll" in desc or "pay roll" in desc:
        return "other"
    if "costco" in desc or "wal-mart" in desc or "walmart" in desc or "grocery" in desc:
        return "groceries"
    if "chevron" in desc or "maverik" in desc or "shell " in desc:
        return "gas"
    if "donation" in desc or "church" in desc or "jesuschrist" in desc:
        return "church"
    if "mcdonald" in desc or "chick-fil" in desc or "raising cane" in desc or "caesars" in desc:
        return "eating out"
    if "visible" in desc or "verizon" in desc or "at&t" in desc or "t-mobile" in desc:
        return "phone"
    if "peacock" in desc or "netflix" in desc or "spotify" in desc:
        return "subscription"
    return "other"


def fallback_categories(
    descriptions: Sequence[str], bank_categories: Sequence[str]
) -> list[str]:
    out: list[str] = []
    for i, d in enumerate(descriptions):
        bc = bank_categories[i] if i < len(bank_categories) else ""
        slug = _fallback_slug(d, bc)
        out.append(display_from_slug(slug))
    return out


def categorize_with_openai(
    descriptions: Sequence[str],
    bank_categories: Sequence[str],
    *,
    batch_size: int = 28,
) -> list[str]:
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key or key == "your_key_here":
        return fallback_categories(descriptions, bank_categories)

    try:
        from openai import OpenAI
    except ImportError:
        return fallback_categories(descriptions, bank_categories)

    try:
        client = OpenAI(api_key=key)
    except Exception:
        return fallback_categories(descriptions, bank_categories)

    n = len(descriptions)
    slug_results: list[str] = ["other"] * n
    try:
        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            chunk_desc = list(descriptions[start:end])
            chunk_bank = list(bank_categories[start:end])
            user_lines = [
                json.dumps(
                    {
                        "i": i,
                        "description": chunk_desc[i],
                        "bank_category": chunk_bank[i]
                        if i < len(chunk_bank)
                        else "",
                    },
                    ensure_ascii=False,
                )
                for i in range(len(chunk_desc))
            ]
            prompt = f"""You categorize personal finance transactions.
Each user line is a JSON object with "i" (0-based index within this batch), "description", and "bank_category".
Assign exactly one category per object from this list. Each string must match exactly (same spelling and capitalization):
{", ".join(ALLOWED_CATEGORIES)}

Return JSON: {{"categories": [{{"i": 0, "category": "Groceries"}}, ...]}}
Include one object per input line; "i" must be the batch-local index (0..n-1)."""

            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": "Items:\n" + "\n".join(user_lines),
                    },
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            text = (resp.choices[0].message.content or "").strip()
            data = json.loads(text)
            arr = data.get("categories")
            if isinstance(arr, list):
                for item in arr:
                    if not isinstance(item, dict):
                        continue
                    idx = item.get("i")
                    raw_cat = str(item.get("category", "other"))
                    slug = slugify_category(raw_cat)
                    if isinstance(idx, int) and 0 <= idx < len(chunk_desc):
                        slug_results[start + idx] = slug
            for j in range(start, end):
                s = slug_results[j]
                if s not in _ALLOWED_SLUGS and not _FREEFORM_SLUG.fullmatch(
                    s
                ):
                    slug_results[j] = _fallback_slug(
                        descriptions[j], bank_categories[j]
                    )
    except Exception:
        return fallback_categories(descriptions, bank_categories)

    return [display_from_slug(s) for s in slug_results]
