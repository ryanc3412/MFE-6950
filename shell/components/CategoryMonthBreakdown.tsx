"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBase } from "../lib/apiBase";

const LedgerPieCharts = dynamic(
  () => import("remote_b/LedgerPieCharts").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Loading charts…</p>
    ),
  }
);

type CatRow = {
  month: string;
  category: string;
  income: number;
  expenses: number;
  net: number;
};

type TabId =
  | { kind: "year"; year: string }
  | { kind: "month"; month: string };

function fmtMoney(n: number) {
  const sign = n < 0 ? "−" : "";
  return sign + Math.abs(n).toFixed(2);
}

function uniqueYears(rows: CatRow[]): string[] {
  const s = new Set<string>();
  for (const r of rows) s.add(r.month.slice(0, 4));
  return [...s].sort((a, b) => b.localeCompare(a));
}

function uniqueMonths(rows: CatRow[]): string[] {
  const s = new Set<string>();
  for (const r of rows) s.add(r.month);
  return [...s].sort((a, b) => b.localeCompare(a));
}

function filterRowsForTab(rows: CatRow[], tab: TabId): CatRow[] {
  if (tab.kind === "year") {
    return rows.filter((r) => r.month.startsWith(`${tab.year}-`));
  }
  return rows.filter((r) => r.month === tab.month);
}

function aggregateNetByCategory(
  rows: CatRow[]
): { category: string; net: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.category, (m.get(r.category) ?? 0) + r.net);
  }
  return [...m.entries()]
    .sort(
      (a, b) =>
        Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0])
    )
    .map(([category, net]) => ({ category, net }));
}

function aggregateByCategory(rows: CatRow[]) {
  const inc = new Map<string, number>();
  const exp = new Map<string, number>();
  for (const r of rows) {
    if (r.income > 0) {
      inc.set(r.category, (inc.get(r.category) ?? 0) + r.income);
    }
    if (r.expenses > 0) {
      exp.set(r.category, (exp.get(r.category) ?? 0) + r.expenses);
    }
  }
  const toSlices = (map: Map<string, number>) =>
    [...map.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  return {
    incomeSlices: toSlices(inc),
    expenseSlices: toSlices(exp),
  };
}

function grandTotals(rows: CatRow[]) {
  let income = 0;
  let expenses = 0;
  for (const r of rows) {
    income += r.income;
    expenses += r.expenses;
  }
  return { income, expenses };
}

function parseTabKey(key: string): TabId | null {
  if (key.startsWith("year:")) return { kind: "year", year: key.slice(5) };
  if (key.startsWith("month:")) return { kind: "month", month: key.slice(6) };
  return null;
}

export default function CategoryMonthBreakdown() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabKey, setTabKey] = useState<string>("");

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`${apiBase()}/db/items/summary/monthly-by-category`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: { rows?: CatRow[] }) => setRows(d.rows ?? []))
      .catch(() =>
        setError(
          "Could not load category breakdown. Is the API running on port 3002?"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabDefs = useMemo(() => {
    const years = uniqueYears(rows);
    const months = uniqueMonths(rows);
    const out: { key: string; label: string }[] = [];
    for (const y of years) {
      out.push({ key: `year:${y}`, label: `${y} (year)` });
    }
    for (const m of months) {
      out.push({ key: `month:${m}`, label: m });
    }
    return out;
  }, [rows]);

  useEffect(() => {
    if (rows.length === 0 || tabDefs.length === 0) return;
    const validKeys = new Set(tabDefs.map((t) => t.key));
    const needReset = tabKey === "" || !validKeys.has(tabKey);
    if (!needReset) return;
    const years = uniqueYears(rows);
    if (years.length > 0) {
      setTabKey(`year:${years[0]}`);
      return;
    }
    const months = uniqueMonths(rows);
    if (months.length > 0) {
      setTabKey(`month:${months[0]}`);
    }
  }, [rows, tabDefs, tabKey]);

  const activeTab = parseTabKey(tabKey);
  const filteredRows = useMemo(() => {
    if (!activeTab) return [];
    return filterRowsForTab(rows, activeTab);
  }, [rows, activeTab]);

  const tableRows = useMemo(
    () => aggregateNetByCategory(filteredRows),
    [filteredRows]
  );

  const pieAggregates = useMemo(
    () => aggregateByCategory(filteredRows),
    [filteredRows]
  );

  const totals = useMemo(() => grandTotals(filteredRows), [filteredRows]);

  const hasData = rows.length > 0;
  const ready = hasData && activeTab !== null;

  return (
    <div style={{ marginTop: "0.5rem", maxWidth: "90rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          className="tool-button"
          style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
          onClick={() => load()}
        >
          Refresh
        </button>
        {loading ? (
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Loading…</span>
        ) : null}
      </div>
      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>{error}</p>
      ) : null}
      {!loading && !error && !hasData ? (
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No data yet.</p>
      ) : null}
      {!loading && !error && ready ? (
        <>
          <div
            style={{
              overflowX: "auto",
              marginBottom: "1.25rem",
              borderBottom: "1px solid #e2e8f0",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              role="tablist"
              aria-label="Time range"
              style={{
                display: "flex",
                gap: "0.15rem",
                flexWrap: "nowrap",
                paddingBottom: "0.5rem",
                minHeight: 40,
              }}
            >
              {tabDefs.map((t) => {
                const active = tabKey === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTabKey(t.key)}
                    style={{
                      flex: "0 0 auto",
                      padding: "0.45rem 0.85rem",
                      fontSize: "0.8125rem",
                      fontWeight: active ? 600 : 500,
                      color: active ? "#0f172a" : "#64748b",
                      background: active ? "#f1f5f9" : "transparent",
                      border: "1px solid",
                      borderColor: active ? "#cbd5e1" : "transparent",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "2rem 2.5rem",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.6rem",
                  color: "#0f172a",
                }}
              >
                {activeTab.kind === "year"
                  ? `${activeTab.year} — categories (net)`
                  : `${activeTab.month} — categories (net)`}
              </h2>
              {tableRows.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                  No rows in this range.
                </p>
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
                      <tr
                        style={{
                          borderBottom: "2px solid #e2e8f0",
                          textAlign: "left",
                        }}
                      >
                        <th style={{ padding: "0.5rem 0.75rem" }}>Category</th>
                        <th style={{ padding: "0.5rem 0.75rem" }}>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r) => (
                        <tr
                          key={r.category}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                        >
                          <td
                            style={{
                              padding: "0.5rem 0.75rem",
                              fontWeight: 500,
                            }}
                          >
                            {r.category}
                          </td>
                          <td
                            style={{
                              padding: "0.5rem 0.75rem",
                              fontWeight: 500,
                              fontVariantNumeric: "tabular-nums",
                              color: r.net >= 0 ? "#15803d" : "#b91c1c",
                            }}
                          >
                            {fmtMoney(r.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ flex: "1 1 420px" }}>
              <LedgerPieCharts
                expenseSlices={pieAggregates.expenseSlices}
                incomeSlices={pieAggregates.incomeSlices}
                totalExpenses={totals.expenses}
                totalIncome={totals.income}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
