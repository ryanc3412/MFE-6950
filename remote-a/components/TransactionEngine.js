"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import styles from "./TransactionEngine.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const snap = { duration: 0.2, ease: "easeOut" };

function fmtMoney(n) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtMatrixMoney(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return v.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonthLong(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function displayCellAmount(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  if (v === 0) return "–";
  return fmtMatrixMoney(v);
}

export default function TransactionEngine() {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [spendMatrix, setSpendMatrix] = useState(null);
  const [matrixErr, setMatrixErr] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsErr, setItemsErr] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [hoverMonth, setHoverMonth] = useState(null);
  const [hoverCategory, setHoverCategory] = useState(null);

  const loadMonthlyMatrix = useCallback(() => {
    setMatrixErr(null);
    fetch(`${API_BASE}/transactions/monthly-matrix`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => setSpendMatrix(d))
      .catch(() =>
        setMatrixErr("Could not load spending matrix. Is the API running?")
      );
  }, []);

  const loadItems = useCallback(() => {
    setItemsErr(null);
    fetch(`${API_BASE}/db/items`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) =>
        setItems(
          (d.items ?? []).slice(0, 75).map((it) => ({
            ...it,
            id: Number(it.id),
          }))
        )
      )
      .catch(() => setItemsErr("Could not load recent transactions."));
  }, []);

  const refreshAll = useCallback(() => {
    setLoadingMeta(true);
    return Promise.all([loadMonthlyMatrix(), loadItems()]).finally(() =>
      setLoadingMeta(false)
    );
  }, [loadMonthlyMatrix, loadItems]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const deleteTransaction = useCallback(
    async (it) => {
      const id = Number(it.id);
      if (!Number.isInteger(id) || id < 1) return;
      setItems((prev) => prev.filter((x) => x.id !== id));
      const url = `${API_BASE}/api/transactions/${id}`;
      try {
        const r = await fetch(url, { method: "DELETE" });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          let msg = "Delete failed.";
          if (typeof data.detail === "string") msg = data.detail;
          throw new Error(msg);
        }
        void loadMonthlyMatrix();
      } catch (e) {
        console.error("[TransactionEngine] delete transaction failed", {
          url,
          id,
          err: e,
        });
        await refreshAll();
      }
    },
    [refreshAll, loadMonthlyMatrix]
  );

  function onFile(file) {
    setUploadErr(null);
    setUploadStatus(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadErr("Please choose a .csv file.");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fetch(`${API_BASE}/transactions/upload`, {
      method: "POST",
      body: fd,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg =
            typeof data.detail === "string" ? data.detail : "Upload failed.";
          throw new Error(msg);
        }
        return data;
      })
      .then((d) => {
        setUploadStatus(
          `Imported ${d.inserted ?? 0} row(s) from ${d.filename ?? file.name}. Categories assigned via gpt-4o-mini (or offline fallback).`
        );
        refreshAll();
      })
      .catch((e) =>
        setUploadErr(e instanceof Error ? e.message : "Upload failed.")
      )
      .finally(() => setUploading(false));
  }

  return (
    <div className="relative max-w-5xl space-y-8 pb-12 md:pb-16">
      <header className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-stardust">
          Desk · transactions
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          Transaction{" "}
          <span className="bg-gradient-to-r from-btc-orange to-btc-gold bg-clip-text text-transparent">
            engine
          </span>
        </h1>
        <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-stardust md:text-base">
          Upload bank CSVs for categorization, then audit the ledger. Charts
          render in Bitcoin orange against the void.
        </p>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={snap}
        className="glass-panel"
      >
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-stardust">
          Upload transactions (CSV)
        </h2>
        <p className="mt-2 font-body text-sm text-stardust/90">
          Columns: date, amount, blank, category hint, merchant description.
        </p>
        <label className="mt-4 block font-mono text-xs uppercase tracking-widest text-stardust">
          File
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={uploading}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-btc-burnt file:to-btc-orange file:px-4 file:py-2 file:font-mono file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.p
              key="up"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={snap}
              className="mt-4 font-mono text-xs uppercase tracking-widest text-btc-orange"
            >
              Parsing and categorizing…
            </motion.p>
          ) : null}
        </AnimatePresence>
        {uploadStatus ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={snap}
            className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4 font-body text-sm text-white"
          >
            {uploadStatus}
          </motion.p>
        ) : null}
        {uploadErr ? (
          <p className="mt-4 rounded-xl border-2 border-btc-orange/70 bg-btc-burnt/10 p-3 font-body text-sm text-btc-orange">
            {uploadErr}
          </p>
        ) : null}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, ...snap }}
        className="glass-panel"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <h2 className="font-heading text-2xl font-bold text-white">
            Spending over time
          </h2>
          <button
            type="button"
            onClick={() => refreshAll()}
            className="min-h-[44px] rounded-full bg-gradient-to-r from-btc-burnt to-btc-orange px-6 font-body text-xs font-bold uppercase tracking-wider text-white shadow-glow-orange transition-all duration-300 hover:scale-105 hover:shadow-glow-orange-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          >
            Refresh
          </button>
        </div>
        {matrixErr ? (
          <p className="font-body text-sm text-btc-orange">{matrixErr}</p>
        ) : loadingMeta && !spendMatrix ? (
          <div className="flex min-h-[12rem] items-center justify-center font-mono text-xs uppercase tracking-widest text-stardust">
            Loading matrix…
          </div>
        ) : !spendMatrix || !(spendMatrix.months?.length > 0) ? (
          <p className="font-body text-sm text-stardust">
            No transaction data yet. Import a CSV to populate category spending by
            month.
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={snap}
            className="relative mt-2 max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#0F1115]"
            onMouseLeave={() => {
              setHoverMonth(null);
              setHoverCategory(null);
            }}
          >
            {(spendMatrix.categories ?? []).length === 0 ? (
              <p className="border-b border-white/10 px-4 py-3 font-body text-sm text-stardust">
                No categorized spending in{" "}
                <span className="font-mono text-white">
                  {spendMatrix.report_year ?? "—"}
                </span>
                . Try another year or import transactions for this year.
              </p>
            ) : null}
            <div className={styles.matrixScroll}>
              <table className="w-max min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 top-0 z-[45] min-w-[10rem] border border-white/10 bg-[#0F1115] px-3 py-3 text-left font-body text-xs font-medium uppercase tracking-wide text-stardust shadow-[1px_0_0_rgba(255,255,255,0.06)]"
                      scope="col"
                    >
                      Category
                    </th>
                    {(spendMatrix.months ?? []).map((mo) => (
                      <th
                        key={mo}
                        scope="col"
                        onMouseEnter={() => {
                          setHoverMonth(mo);
                          setHoverCategory(null);
                        }}
                        className={`sticky top-0 z-30 min-w-[7.25rem] whitespace-nowrap border border-white/10 bg-[#0F1115] px-2 py-3 text-center font-body text-xs font-medium capitalize tracking-wide text-white transition-colors ${
                          hoverMonth === mo ? "bg-white/5" : ""
                        }`}
                      >
                        {formatMonthLong(mo)}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="sticky right-0 top-0 z-[45] min-w-[7.5rem] border border-white/10 bg-[#0F1115] px-3 py-3 text-right font-body text-xs font-semibold uppercase tracking-wide text-[#F7931A] shadow-[-8px_0_14px_-6px_rgba(0,0,0,0.65)]"
                    >
                      Year total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(spendMatrix.categories ?? []).map((cat, ri) => (
                    <tr key={cat}>
                      <th
                        scope="row"
                        onMouseEnter={() => {
                          setHoverCategory(cat);
                          setHoverMonth(null);
                        }}
                        className={`sticky left-0 z-20 border border-white/10 bg-[#0F1115] px-3 py-2.5 text-left font-body text-sm font-medium capitalize text-white shadow-[1px_0_0_rgba(255,255,255,0.06)] transition-colors ${
                          hoverCategory === cat ? "bg-white/5" : ""
                        }`}
                      >
                        {cat}
                      </th>
                      {(spendMatrix.months ?? []).map((mo, j) => {
                        const v = spendMatrix.matrix?.[ri]?.[j] ?? 0;
                        const rowOn = hoverCategory === cat;
                        const colOn = hoverMonth === mo;
                        const cross = rowOn && colOn;
                        return (
                          <td
                            key={`${cat}-${mo}`}
                            onMouseEnter={() => {
                              setHoverCategory(cat);
                              setHoverMonth(mo);
                            }}
                            className={`border border-white/10 px-2 py-2.5 text-right font-mono text-xs tabular-nums tracking-tight text-stardust transition-colors ${
                              cross
                                ? "bg-white/10 text-white"
                                : rowOn || colOn
                                  ? "bg-white/5 text-white"
                                  : ""
                            }`}
                          >
                            {displayCellAmount(v)}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-20 border border-white/10 bg-[#0F1115] px-3 py-2.5 text-right font-mono text-xs font-medium tabular-nums text-[#F7931A] shadow-[-8px_0_14px_-6px_rgba(0,0,0,0.55)]">
                        {fmtMatrixMoney(spendMatrix.row_totals?.[ri] ?? 0)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-white/10">
                    <th
                      scope="row"
                      onMouseEnter={() => {
                        setHoverCategory(null);
                        setHoverMonth(null);
                      }}
                      className="sticky left-0 z-20 border border-white/10 bg-[#0F1115] px-3 py-3 text-left font-body text-xs font-semibold uppercase tracking-wide text-stardust shadow-[1px_0_0_rgba(255,255,255,0.06)]"
                    >
                      Monthly totals
                    </th>
                    {(spendMatrix.months ?? []).map((mo, ji) => (
                      <td
                        key={`tot-${mo}`}
                        onMouseEnter={() => {
                          setHoverMonth(mo);
                          setHoverCategory(null);
                        }}
                        className={`border border-white/10 px-2 py-3 text-right font-mono text-xs font-medium tabular-nums text-[#FFD600] transition-colors ${
                          hoverMonth === mo ? "bg-white/5" : ""
                        }`}
                      >
                        {displayCellAmount(
                          spendMatrix.column_totals?.[ji] ?? 0
                        )}
                      </td>
                    ))}
                    <td className="sticky right-0 z-20 border border-white/10 bg-[#0F1115] px-3 py-3 text-right font-mono text-sm font-semibold tabular-nums text-[#F7931A] shadow-[-8px_0_14px_-6px_rgba(0,0,0,0.55)]">
                      {fmtMatrixMoney(spendMatrix.grand_total ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, ...snap }}
        className="glass-panel overflow-hidden"
      >
        <h2 className="font-heading text-2xl font-bold text-white">
          Recent transactions
        </h2>
        {itemsErr ? (
          <p className="mt-3 text-sm text-btc-orange">{itemsErr}</p>
        ) : items.length === 0 && !loadingMeta ? (
          <p className="mt-3 font-body text-sm text-stardust">No rows yet.</p>
        ) : (
          <div className="mt-4 max-h-[420px] overflow-auto border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 border-b-2 border-white/10 bg-surface">
                <tr className="font-mono text-[10px] uppercase tracking-widest text-stardust">
                  <th className="border-r border-white/10 px-3 py-2">
                    Date
                  </th>
                  <th className="border-r border-white/10 px-3 py-2">
                    Category
                  </th>
                  <th className="border-r border-white/10 px-3 py-2 text-right">
                    Amount
                  </th>
                  <th className="border-r border-white/10 px-3 py-2">
                    Description
                  </th>
                  <th className="w-14 px-2 py-2 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="group border-b border-white/10 transition-[box-shadow,background-color] duration-150 hover:bg-black/35"
                  >
                    <td className="whitespace-nowrap border-r border-white/10 px-3 py-2 font-mono text-xs tabular-nums text-stardust/90">
                      {it.item_date}
                    </td>
                    <td className="border-r border-white/10 px-3 py-2 font-body text-white">
                      {it.category}
                    </td>
                    <td
                      className={`border-r border-white/10 px-3 py-2 text-right font-mono text-xs tabular-nums ${
                        it.price >= 0 ? "text-white" : "text-btc-orange"
                      }`}
                    >
                      {it.price >= 0 ? "+" : "−"}
                      {Math.abs(it.price).toFixed(2)}
                    </td>
                    <td className="max-w-xs truncate border-r border-white/10 px-3 py-2 font-body text-sm text-stardust/90">
                      {it.comment || "—"}
                    </td>
                    <td className="px-1 py-1 text-right align-middle">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void deleteTransaction(it);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-stardust opacity-30 transition-all duration-150 hover:border-red-500/35 hover:bg-red-950/25 hover:text-red-400 hover:opacity-100 hover:shadow-[0_0_14px_rgba(234,88,12,0.45),0_0_20px_rgba(220,38,38,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange/80 group-hover:opacity-100"
                        aria-label={`Delete transaction ${it.id}`}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
}
