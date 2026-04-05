import { parseCsvLine } from "./csvLine";

/**
 * Financial CSV → DB pipeline: edit THIS file to change rows after parse and before API insert.
 *
 * Examples you might add here:
 * - Drop or merge rows, normalize merchant names in `comment`
 * - Reclassify amounts, split one CSV row into several purchases
 * - Fix systematic date/price quirks from your bank export
 */

export type PurchaseRow = {
  item_date: string;
  price: number;
  comment: string;
  category: string;
};

/**
 * Strip currency clutter; returns null if not a usable number.
 * Excel/Sheets often use Unicode minus (U+2212); Number("−19") is NaN — normalize to ASCII "-".
 * Also supports accounting negatives: (19.50) → -19.5
 */
export function parsePriceCell(raw: string): number | null {
  let t = raw.replace(/[$,\s\u00a0\u2007\u202f]/g, "").trim();
  t = t.replace(/[\u2212\u2012\u2013\u2014\uFE58\uFE63\uFF0D]/g, "-");

  let negate = false;
  if (/^\(.*\)$/.test(t)) {
    negate = true;
    t = t.slice(1, -1).replace(/[$,\s\u00a0\u2007\u202f]/g, "").trim();
    t = t.replace(/[\u2212\u2012\u2013\u2014\uFE58\uFE63\uFF0D]/g, "-");
  }

  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const v = negate ? -Math.abs(n) : n;
  return v;
}

/**
 * Best-effort → YYYY-MM-DD. Extend this if your files use another format.
 */
export function coerceDateToIso(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = m[1].padStart(2, "0");
    const day = m[2].padStart(2, "0");
    return `${m[3]}-${month}-${day}`;
  }
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Columns: A=date, B=price, C=ignored (e.g. *), D=category, E+=description
 * (first non-empty cell from column E onward).
 */
function explanationAfterCategory(cells: string[]): string {
  for (let i = 4; i < cells.length; i++) {
    const t = (cells[i] ?? "").trim();
    if (t !== "") return t;
  }
  return "";
}

export function parseFinancialCsvText(text: string): PurchaseRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: PurchaseRow[] = [];
  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (cells.length < 2) continue;
    const dateIso = coerceDateToIso(cells[0] ?? "");
    const price = parsePriceCell(cells[1] ?? "");
    if (dateIso === null || price === null) continue;
    const category = (cells[3] ?? "").trim() || "other";
    const comment = explanationAfterCategory(cells);
    out.push({ item_date: dateIso, price, comment, category });
  }
  return out;
}

/**
 * Hook: rows are fully parsed (valid date + price). Return the list to send to the API.
 */
export function preprocessPurchaseRows(rows: PurchaseRow[]): PurchaseRow[] {
  return rows;
}
