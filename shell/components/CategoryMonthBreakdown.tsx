"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBase } from "../lib/apiBase";

type CatRow = {
  month: string;
  category: string;
  income: number;
  expenses: number;
  net: number;
};

type TabId =
  | { kind: "all" }
  | { kind: "year"; year: string }
  | { kind: "month"; month: string };

const PIE_SIZE = 300;
const PIE_CX = PIE_SIZE / 2;
const PIE_CY = PIE_SIZE / 2;
const PIE_R = PIE_SIZE / 2 - 28;

const PIE_COLORS = [
  "#9ec5e8",
  "#f0b8bc",
  "#b5dfc4",
  "#f5e0a8",
  "#d4c4f0",
  "#a8dce8",
  "#f0d4b8",
  "#e8c4d8",
  "#c4d4f0",
  "#b8ece0",
  "#e0c8f0",
  "#c8e8d4",
];

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
  if (tab.kind === "all") return rows;
  if (tab.kind === "year") {
    return rows.filter((r) => r.month.startsWith(`${tab.year}-`));
  }
  return rows.filter((r) => r.month === tab.month);
}

function aggregateNetByCategory(rows: CatRow[]): { category: string; net: number }[] {
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

function parseTabKey(key: string): TabId {
  if (key === "all") return { kind: "all" };
  if (key.startsWith("year:")) return { kind: "year", year: key.slice(5) };
  return { kind: "month", month: key.slice(6) };
}

function CategoryPieChart({
  title,
  slices,
  emptyMessage,
  sideLabel,
  sideTotal,
}: {
  title: string;
  slices: { label: string; value: number }[];
  emptyMessage: string;
  sideLabel: string;
  sideTotal: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sliceTotal = slices.reduce((s, x) => s + x.value, 0);

  if (sliceTotal <= 0) {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "1.25rem",
        }}
      >
        <div style={{ width: PIE_SIZE }}>
          <h3
            style={{
              fontSize: "0.95rem",
              marginBottom: "0.5rem",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            {title}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{emptyMessage}</p>
        </div>
        <div style={{ paddingTop: "1.75rem" }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#94a3b8",
              marginBottom: "0.25rem",
            }}
          >
            {sideLabel}
          </div>
          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: 600,
              color: "#475569",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtMoney(sideTotal)}
          </div>
        </div>
      </div>
    );
  }

  let ang = -Math.PI / 2;
  const dimOthers = hoveredIndex !== null;

  const paths = slices.map((slice, i) => {
    const frac = slice.value / sliceTotal;
    const a0 = ang;
    const a1 = ang + frac * 2 * Math.PI;
    ang = a1;
    const x0 = PIE_CX + PIE_R * Math.cos(a0);
    const y0 = PIE_CY + PIE_R * Math.sin(a0);
    const x1 = PIE_CX + PIE_R * Math.cos(a1);
    const y1 = PIE_CY + PIE_R * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    const d = `M ${PIE_CX} ${PIE_CY} L ${x0} ${y0} A ${PIE_R} ${PIE_R} 0 ${large} 1 ${x1} ${y1} Z`;
    return (
      <path
        key={`${slice.label}-${i}`}
        d={d}
        fill={PIE_COLORS[i % PIE_COLORS.length]}
        stroke="#f8fafc"
        strokeWidth={2}
        style={{
          cursor: "pointer",
          opacity: dimOthers && hoveredIndex !== i ? 0.42 : 1,
          transition: "opacity 0.12s ease",
        }}
        onMouseEnter={() => setHoveredIndex(i)}
      >
        <title>{`${slice.label}: ${fmtMoney(slice.value)}`}</title>
      </path>
    );
  });

  const hi = hoveredIndex !== null ? slices[hoveredIndex] : null;
  const hiPct =
    hi !== null ? ((hi.value / sliceTotal) * 100).toFixed(1) : "";

  const vb = PIE_SIZE;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: "1.25rem 1.75rem",
      }}
    >
      <div>
        <h3
          style={{
            fontSize: "0.95rem",
            marginBottom: "0.5rem",
            fontWeight: 600,
            color: "#334155",
          }}
        >
          {title}
        </h3>
        <div style={{ position: "relative", width: PIE_SIZE }}>
          {hi ? (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 8,
                transform: "translateX(-50%)",
                background: "#334155",
                color: "#f8fafc",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.35,
                pointerEvents: "none",
                zIndex: 2,
                boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
                textAlign: "center",
                maxWidth: 220,
              }}
            >
              <div style={{ fontWeight: 600 }}>{hi.label}</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtMoney(hi.value)}
                <span style={{ color: "#cbd5e1", marginLeft: 6 }}>
                  ({hiPct}%)
                </span>
              </div>
            </div>
          ) : null}
          <svg
            width={PIE_SIZE}
            height={PIE_SIZE}
            viewBox={`0 0 ${vb} ${vb}`}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ display: "block" }}
          >
            {paths}
          </svg>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0.6rem 0 0",
            fontSize: "0.78rem",
            maxWidth: PIE_SIZE + 40,
          }}
        >
          {slices.map((s, i) => (
            <li
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                marginBottom: "0.3rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: PIE_COLORS[i % PIE_COLORS.length],
                }}
              />
              <span style={{ flex: "1 1 auto", minWidth: 0 }}>{s.label}</span>
              <span
                style={{
                  color: "#64748b",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {((s.value / sliceTotal) * 100).toFixed(0)}%
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtMoney(s.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ paddingTop: "1.75rem", minWidth: 130 }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#94a3b8",
            marginBottom: "0.35rem",
          }}
        >
          {sideLabel}
        </div>
        <div
          style={{
            fontSize: "1.45rem",
            fontWeight: 600,
            color: "#475569",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}
        >
          {fmtMoney(sideTotal)}
        </div>
      </div>
    </div>
  );
}

export default function CategoryMonthBreakdown() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabKey, setTabKey] = useState<string>("all");

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
    const out: { key: string; label: string }[] = [{ key: "all", label: "All" }];
    for (const y of years) {
      out.push({ key: `year:${y}`, label: `${y} (year)` });
    }
    for (const m of months) {
      out.push({ key: `month:${m}`, label: m });
    }
    return out;
  }, [rows]);

  useEffect(() => {
    if (tabDefs.length === 0) return;
    const valid = new Set(tabDefs.map((t) => t.key));
    if (!valid.has(tabKey)) setTabKey("all");
  }, [tabDefs, tabKey]);

  const activeTab = parseTabKey(tabKey);
  const filteredRows = useMemo(
    () => filterRowsForTab(rows, activeTab),
    [rows, activeTab]
  );

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
      {!loading && !error && hasData ? (
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
                {activeTab.kind === "all"
                  ? "All categories (net)"
                  : activeTab.kind === "year"
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

            <div
              style={{
                flex: "1 1 420px",
                display: "flex",
                flexDirection: "column",
                gap: "2.25rem",
                paddingTop: "0.15rem",
              }}
            >
              <CategoryPieChart
                title="Expenses by category"
                slices={pieAggregates.expenseSlices}
                emptyMessage="No expenses in this range."
                sideLabel="Total expenses"
                sideTotal={totals.expenses}
              />
              <CategoryPieChart
                title="Income by category"
                slices={pieAggregates.incomeSlices}
                emptyMessage="No income in this range."
                sideLabel="Total income"
                sideTotal={totals.income}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
