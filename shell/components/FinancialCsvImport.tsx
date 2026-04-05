"use client";

import { useState } from "react";
import { apiBase } from "../lib/apiBase";
import {
  parseFinancialCsvText,
  preprocessPurchaseRows,
} from "../lib/preprocessPurchases";

export default function FinancialCsvImport() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(file: File | null) {
    setError(null);
    setStatus(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = parseFinancialCsvText(text);
        const rows = preprocessPurchaseRows(parsed);
        if (rows.length === 0) {
          setError(
            "No valid rows found. Need date (column A) and price (column B); column C is skipped; description is the first non-empty cell after that (often column E if D is blank)."
          );
          return;
        }
        setLoading(true);
        fetch(`${apiBase()}/db/items/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: rows }),
        })
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then((d: { inserted?: number }) => {
            const n = d.inserted ?? rows.length;
            setStatus(
              `Saved ${n} purchase${n === 1 ? "" : "es"} from ${file.name}. Open CSV table in the nav to see the list and monthly totals.`
            );
          })
          .catch(() => setError("Could not save to the API. Is it running on port 3002?"))
          .finally(() => setLoading(false));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read the file.");
      }
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file);
  }

  return (
    <div className="tool-page" style={{ maxWidth: "36rem" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "1rem", fontWeight: 600 }}>
        Upload purchases CSV
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#64748b",
          marginBottom: "1rem",
          lineHeight: 1.55,
        }}
      >
        No header row — the first line is a purchase. Columns:{" "}
        <strong>A</strong> date, <strong>B</strong> price (negative = expense,
        positive = income), <strong>C</strong> ignored (e.g. *). The description
        is the <strong>first non-empty cell</strong> after column C (so if D is
        blank and E has the merchant name, E is used). Rows append to the
        database (re-upload duplicates unless you clear the DB).
      </p>
      <label className="tool-label" htmlFor="fin-csv-file">
        CSV file
      </label>
      <input
        id="fin-csv-file"
        type="file"
        accept=".csv,text/csv"
        className="tool-input"
        disabled={loading}
        style={{ padding: "0.5rem 0" }}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          handleFile(f);
          e.target.value = "";
        }}
      />
      <p
        style={{
          fontSize: "0.8rem",
          color: "#94a3b8",
          marginBottom: "1rem",
          lineHeight: 1.5,
        }}
      >
        To change how rows are interpreted or transformed before saving, edit{" "}
        <code style={{ fontSize: "0.75rem" }}>shell/lib/preprocessPurchases.ts</code>{" "}
        (<code>preprocessPurchaseRows</code>, <code>coerceDateToIso</code>,{" "}
        <code>parsePriceCell</code>).
      </p>
      {loading ? (
        <div className="tool-result">Saving…</div>
      ) : null}
      {status ? <div className="tool-result">{status}</div> : null}
      {error ? <div className="tool-error">{error}</div> : null}
    </div>
  );
}
