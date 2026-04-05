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
            "No valid rows found. Need date (A), price (B); C ignored; category (D); description from column E onward (first non-empty)."
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
            setStatus(`Saved ${n} row${n === 1 ? "" : "s"} from ${file.name}.`);
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
    <div>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "1rem", fontWeight: 600 }}>
        Upload purchases CSV
      </h1>
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
      {loading ? (
        <div className="tool-result">Saving…</div>
      ) : null}
      {status ? <div className="tool-result">{status}</div> : null}
      {error ? <div className="tool-error">{error}</div> : null}
    </div>
  );
}
