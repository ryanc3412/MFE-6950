"use client";

// remote-b: expense + income pie charts for shell home (Module Federation).
import { useState } from "react";

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

function fmtMoney(n) {
  const sign = n < 0 ? "−" : "";
  return sign + Math.abs(n).toFixed(2);
}

function CategoryPieChart({
  title,
  slices,
  emptyMessage,
  sideLabel,
  sideTotal,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
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

/**
 * @param {{
 *   expenseSlices?: { label: string; value: number }[];
 *   incomeSlices?: { label: string; value: number }[];
 *   totalExpenses?: number;
 *   totalIncome?: number;
 * }} props
 */
export default function LedgerPieCharts({
  expenseSlices = [],
  incomeSlices = [],
  totalExpenses = 0,
  totalIncome = 0,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2.25rem",
        paddingTop: "0.15rem",
      }}
    >
      <CategoryPieChart
        title="Expenses by category"
        slices={expenseSlices}
        emptyMessage="No expenses in this range."
        sideLabel="Total expenses"
        sideTotal={totalExpenses}
      />
      <CategoryPieChart
        title="Income by category"
        slices={incomeSlices}
        emptyMessage="No income in this range."
        sideLabel="Total income"
        sideTotal={totalIncome}
      />
    </div>
  );
}
