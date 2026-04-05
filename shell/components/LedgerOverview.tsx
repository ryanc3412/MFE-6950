"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBase } from "../lib/apiBase";

type Item = {
  id: number;
  item_date: string;
  price: number;
  comment: string;
  category: string;
  created_at: string;
};

type MonthRow = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

function fmtMoney(n: number) {
  const sign = n < 0 ? "−" : "";
  return sign + Math.abs(n).toFixed(2);
}

export default function LedgerOverview() {
  const [items, setItems] = useState<Item[]>([]);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    const base = apiBase();
    Promise.all([
      fetch(`${base}/db/items`).then((r) => {
        if (!r.ok) throw new Error(`items ${r.status}`);
        return r.json();
      }),
      fetch(`${base}/db/items/summary/monthly`).then((r) => {
        if (!r.ok) throw new Error(`summary ${r.status}`);
        return r.json();
      }),
    ])
      .then(([itemsRes, sumRes]) => {
        setItems(itemsRes.items ?? []);
        setMonths(sumRes.months ?? []);
      })
      .catch(() =>
        setError("Could not load ledger data. Is the API running on port 3002?")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "56rem" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "1rem", fontWeight: 600 }}>
        Purchases &amp; income
      </h1>

      {loading ? <p style={{ color: "#64748b" }}>Loading…</p> : null}
      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>{error}</p>
      ) : null}

      {!loading && !error ? (
        <>
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", fontWeight: 600 }}>
              By month
            </h2>
            {months.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No data yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Month</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Income (+)</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Expenses (|−|)</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.month} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>
                          {m.month}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#15803d" }}>
                          {fmtMoney(m.income)}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#b45309" }}>
                          {fmtMoney(m.expenses)}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontWeight: 500,
                            color: m.net >= 0 ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {fmtMoney(m.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
                All rows
                {items.length > 0 ? (
                  <span style={{ fontWeight: 400, color: "#64748b" }}>
                    {" "}
                    ({items.length} {items.length === 1 ? "item" : "items"})
                  </span>
                ) : null}
              </h2>
              <button
                type="button"
                className="tool-button"
                style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
                onClick={() => load()}
              >
                Refresh
              </button>
            </div>
            {items.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No rows yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th
                        style={{
                          padding: "0.5rem 0.5rem",
                          width: "2.5rem",
                          textAlign: "right",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        #
                      </th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Date</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Category</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Amount</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, index) => (
                      <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td
                          style={{
                            padding: "0.5rem 0.5rem",
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            color: "#94a3b8",
                          }}
                        >
                          {index + 1}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{it.item_date}</td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>
                          {it.category || "other"}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontVariantNumeric: "tabular-nums",
                            color: it.price >= 0 ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {fmtMoney(it.price)}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>
                          {it.comment || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
