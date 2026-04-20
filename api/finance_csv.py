"""Parse bank export CSV (same column layout as shell/lib/preprocessPurchases.ts)."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class ParsedRow:
    item_date: str
    amount: float
    bank_category: str
    description: str
    raw_line: str


def _parse_price_cell(raw: str) -> float | None:
    t = re.sub(r"[$,\s\u00a0\u2007\u202f]", "", raw.strip())
    t = re.sub(r"[\u2212\u2012\u2013\u2014\uFE58\uFE63\uFF0D]", "-", t)
    negate = False
    if re.match(r"^\(.*\)$", t):
        negate = True
        t = t[1:-1]
        t = re.sub(r"[$,\s\u00a0\u2007\u202f]", "", t.strip())
        t = re.sub(r"[\u2212\u2012\u2013\u2014\uFE58\uFE63\uFF0D]", "-", t)
    if t == "":
        return None
    try:
        n = float(t)
    except ValueError:
        return None
    if not (n == n):  # NaN
        return None
    return -abs(n) if negate else n


def _coerce_date_to_iso(raw: str) -> str | None:
    t = raw.strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", t):
        return t
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", t)
    if m:
        month = m.group(1).zfill(2)
        day = m.group(2).zfill(2)
        return f"{m.group(3)}-{month}-{day}"
    return None


def _explanation_after_category(cells: list[str]) -> str:
    for i in range(4, len(cells)):
        cell = (cells[i] or "").strip()
        if cell:
            return cell
    return ""


def parse_financial_csv_text(text: str) -> list[ParsedRow]:
    lines = [ln for ln in text.splitlines() if ln.strip()]
    out: list[ParsedRow] = []
    for line in lines:
        cells = _parse_csv_line(line)
        if len(cells) < 2:
            continue
        date_iso = _coerce_date_to_iso(cells[0] or "")
        price = _parse_price_cell(cells[1] or "")
        if date_iso is None or price is None:
            continue
        bank_cat = (cells[3] or "").strip() if len(cells) > 3 else ""
        desc = _explanation_after_category(cells)
        out.append(
            ParsedRow(
                item_date=date_iso,
                amount=price,
                bank_category=bank_cat,
                description=desc,
                raw_line=line,
            )
        )
    return out


def _parse_csv_line(line: str) -> list[str]:
    cells: list[str] = []
    cur: list[str] = []
    i = 0
    in_quotes = False
    while i < len(line):
        c = line[i]
        if c == '"':
            if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                cur.append('"')
                i += 2
                continue
            in_quotes = not in_quotes
            i += 1
            continue
        if c == "," and not in_quotes:
            cells.append("".join(cur).strip())
            cur = []
            i += 1
            continue
        cur.append(c)
        i += 1
    cells.append("".join(cur).strip())
    return cells
