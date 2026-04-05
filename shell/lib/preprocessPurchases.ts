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
};

/** Strip currency clutter; returns null if not a usable number. */
export function parsePriceCell(raw: string): number | null {
  const t = raw.replace(/[$,\s]/g, "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
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
 * Column layout: 0 = date, 1 = price, 2 = ignored (e.g. *), then description.
 * Many exports leave the next column empty and put the merchant string one column
 * over (e.g. blank D, text in E). We use the first non-empty cell from index 3 onward.
 */
function explanationFromCells(cells: string[]): string {
  for (let i = 3; i < cells.length; i++) {
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
    const comment = explanationFromCells(cells);
    out.push({ item_date: dateIso, price, comment });
  }
  return out;
}

/**
 * Hook: rows are fully parsed (valid date + price). Return the list to send to the API.
 */
export function preprocessPurchaseRows(rows: PurchaseRow[]): PurchaseRow[] {
  return rows;
}
