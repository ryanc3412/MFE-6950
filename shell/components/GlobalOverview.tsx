"use client";

import { animate, AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { apiBase } from "../lib/apiBase";
import MarketTickerMarquee from "./MarketTickerMarquee";

type SubAccount = {
  id: number;
  name: string;
  balance: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type BucketBlock = {
  bucket: string;
  label: string;
  total: number;
  sub_accounts: SubAccount[];
};

type HierarchyResponse = {
  grand_total: number;
  bucket_totals: {
    checking: number;
    stock_market: number;
    retirement: number;
  };
  buckets: BucketBlock[];
};

function fmtMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 1e-6;
}

/** SVG gradient fill avoids `background-clip: text` bugs (invisible text in some browsers). */
function NetWorthHeroAmount({ display }: { display: number }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `nwfire-${uid}`;
  const label = fmtMoney(display);
  return (
    <motion.div
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-2 w-full"
    >
      <svg
        viewBox="0 0 820 72"
        className="block h-14 w-full max-w-3xl overflow-visible md:h-[3.75rem] lg:h-[4.25rem]"
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-label={`Net worth ${label}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F7931A" />
            <stop offset="100%" stopColor="#FFD600" />
          </linearGradient>
        </defs>
        <text
          x="0"
          y="50"
          fill={`url(#${gradId})`}
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 46,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {label}
        </text>
      </svg>
    </motion.div>
  );
}

const motionSnap = { duration: 0.2, ease: "easeOut" as const };

function useCountUp(value: number, duration = 0.65) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const c = animate(fromRef.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        fromRef.current = value;
      },
    });
    return () => c.stop();
  }, [value, duration]);

  return display;
}

type RetryToast = {
  message: string;
  retry: () => void;
};

export default function GlobalOverview() {
  const [data, setData] = useState<HierarchyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addingBucket, setAddingBucket] = useState<string | null>(null);
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const [balanceDrafts, setBalanceDrafts] = useState<Record<number, string>>(
    {}
  );
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [savedFlashId, setSavedFlashId] = useState<number | null>(null);
  const [balanceErrorId, setBalanceErrorId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [retryToast, setRetryToast] = useState<RetryToast | null>(null);
  const deletePopoverRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`${apiBase()}/wealth/hierarchy`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: HierarchyResponse) => {
        setData(d);
        const drafts: Record<number, string> = {};
        for (const b of d.buckets) {
          for (const s of b.sub_accounts) {
            drafts[s.id] = String(s.balance);
          }
        }
        setBalanceDrafts(drafts);
      })
      .catch(() =>
        setError("Could not load wealth data. Is the API running on port 3002?")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (savedFlashId == null) return;
    const t = window.setTimeout(() => setSavedFlashId(null), 1400);
    return () => window.clearTimeout(t);
  }, [savedFlashId]);

  useEffect(() => {
    if (deleteConfirmId == null) return;
    const onDown = (e: MouseEvent) => {
      const el = deletePopoverRef.current;
      if (el && !el.contains(e.target as Node)) {
        setDeleteConfirmId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirmId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [deleteConfirmId]);

  const rawGrand = Number(data?.grand_total);
  const grandSafe = Number.isFinite(rawGrand) ? rawGrand : 0;
  const bt = data?.bucket_totals;
  const grandDisplay = useCountUp(grandSafe);
  const chkDisplay = useCountUp(bt?.checking ?? 0);
  const mktDisplay = useCountUp(bt?.stock_market ?? 0);
  const retDisplay = useCountUp(bt?.retirement ?? 0);
  const getSubBalance = useCallback(
    (id: number) => {
      if (!data) return 0;
      for (const b of data.buckets) {
        const s = b.sub_accounts.find((x) => x.id === id);
        if (s) return s.balance;
      }
      return 0;
    },
    [data]
  );

  const saveBalance = useCallback(
    (id: number) => {
      const raw = balanceDrafts[id];
      const num = Number(raw);
      if (raw === undefined || Number.isNaN(num)) {
        setError("Enter a valid balance.");
        setBalanceErrorId(id);
        return;
      }
      const serverBal = getSubBalance(id);
      if (nearlyEqual(num, serverBal)) {
        setBalanceErrorId(null);
        setEditingBalanceId(null);
        return;
      }

      const attempt = () => {
        setSavingId(id);
        setBalanceErrorId(null);
        setError(null);
        setRetryToast(null);
        fetch(`${apiBase()}/wealth/sub-accounts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ balance: num }),
        })
          .then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            setSavedFlashId(id);
            setEditingBalanceId((e) => (e === id ? null : e));
            return load();
          })
          .catch(() => {
            setBalanceErrorId(id);
            setEditingBalanceId(id);
            setRetryToast({
              message: "Could not save balance.",
              retry: attempt,
            });
          })
          .finally(() => setSavingId(null));
      };

      attempt();
    },
    [balanceDrafts, getSubBalance, load]
  );

  function removeSub(id: number) {
    setDeletingId(id);
    setError(null);
    setDeleteConfirmId(null);
    fetch(`${apiBase()}/wealth/sub-accounts/${id}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return load();
      })
      .catch(() => setError("Could not delete sub-account."))
      .finally(() => setDeletingId(null));
  }

  function addSub(bucket: string) {
    const name = (newNames[bucket] ?? "").trim();
    if (!name) {
      setError("Enter a name for the new sub-account.");
      return;
    }
    setError(null);
    fetch(`${apiBase()}/wealth/sub-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, name }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        setNewNames((prev) => ({ ...prev, [bucket]: "" }));
        setAddingBucket(null);
        return load();
      })
      .catch(() => setError("Could not add sub-account (duplicate name?)."));
  }

  function onBalanceBlur(id: number) {
    if (savingId === id) return;
    const raw = balanceDrafts[id];
    const num = Number(raw);
    if (raw === undefined || Number.isNaN(num)) {
      setBalanceDrafts((p) => ({
        ...p,
        [id]: String(getSubBalance(id)),
      }));
      setError("Enter a valid balance.");
      setEditingBalanceId(null);
      return;
    }
    const serverBal = getSubBalance(id);
    if (nearlyEqual(num, serverBal)) {
      setBalanceErrorId(null);
      setEditingBalanceId(null);
      return;
    }
    saveBalance(id);
  }

  function onBalanceKeyDown(
    id: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      const server = getSubBalance(id);
      setBalanceDrafts((prev) => ({ ...prev, [id]: String(server) }));
      setBalanceErrorId((cur) => (cur === id ? null : cur));
      setEditingBalanceId(null);
    }
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {retryToast ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={motionSnap}
            className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-3 rounded-xl border-2 border-btc-orange/60 bg-surface/95 px-4 py-3 shadow-glow-orange backdrop-blur-md"
          >
            <p className="flex-1 font-body text-sm text-white">
              {retryToast.message}{" "}
              <button
                type="button"
                className="btc-link font-semibold"
                onClick={retryToast.retry}
              >
                Retry
              </button>
            </p>
            <button
              type="button"
              className="font-mono text-xs uppercase text-stardust hover:text-white"
              aria-label="Dismiss"
              onClick={() => setRetryToast(null)}
            >
              ×
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header className="relative mb-10 pb-8">
        <div
          className="pointer-events-none absolute -right-4 top-0 hidden h-32 w-32 md:block"
          aria-hidden
        >
          <div className="absolute inset-0 animate-[spin_12s_linear_infinite] rounded-full border border-btc-orange/25 motion-reduce:animate-none" />
          <div className="absolute inset-3 animate-[spin_18s_linear_infinite_reverse] rounded-full border border-btc-gold/20 motion-reduce:animate-none" />
          <div className="absolute inset-[26%] rounded-full bg-btc-orange/10 blur-xl" />
        </div>
        <p className="btc-kicker">Wealth &amp; ledgers</p>
        <h1 className="mt-3 font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Command{" "}
          <span className="text-gradient-value">Center</span>
        </h1>
        <p className="mt-6 max-w-3xl font-body text-base leading-relaxed text-stardust md:text-lg">
          Sub-accounts roll into three buckets—checking, stock market, and
          retirement—with balances reconciled in SQLite and surfaced here in
          real time.
        </p>
      </header>

      <MarketTickerMarquee />

      {error ? (
        <p
          className="mb-6 rounded-xl border-2 border-btc-orange/70 bg-btc-burnt/10 px-4 py-3 font-body text-sm text-btc-orange"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading || !data ? (
        <p className="font-mono text-sm uppercase tracking-widest text-stardust">
          Loading portfolio…
        </p>
      ) : (
        <>
          <div className="mb-12 grid grid-cols-1 rounded-2xl border border-white/10 lg:grid-cols-12">
            <section
              className="relative z-0 rounded-t-2xl border-b border-white/10 bg-gradient-to-br from-surface via-surface to-btc-burnt/5 p-6 lg:col-span-8 lg:rounded-bl-2xl lg:rounded-br-none lg:rounded-tr-none lg:border-b-0 lg:border-r lg:p-10"
              aria-labelledby="net-worth-heading"
            >
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-grid-fade opacity-40"
                aria-hidden
              />
              <p
                id="net-worth-heading"
                className="relative z-10 btc-kicker text-white"
              >
                Net worth
              </p>
              <div className="relative z-10">
                <NetWorthHeroAmount display={grandDisplay} />
              </div>
              <p className="relative z-10 mt-4 max-w-md font-body text-sm leading-relaxed text-stardust">
                All buckets summed—precision totals in tabular monospace where
                it matters.
              </p>
            </section>
            <aside className="relative flex flex-col justify-center rounded-b-2xl border-white/10 bg-black/30 p-6 backdrop-blur-md lg:col-span-4 lg:rounded-bl-none lg:rounded-br-2xl lg:rounded-tl-none lg:rounded-tr-2xl">
              <p className="btc-kicker">Desk note</p>
              <p className="mt-3 font-body text-sm leading-relaxed text-stardust">
                Add lines under each bucket below. Balances auto-save on blur
                or Enter; remove rows with the trash control.
              </p>
            </aside>
          </div>

          <section
            className="mb-12 grid grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-surface text-white shadow-card-ambient md:grid-cols-3"
            aria-label="Bucket totals"
          >
            {[
              { label: "Checking total", v: chkDisplay },
              { label: "Market total", v: mktDisplay },
              { label: "Retirement total", v: retDisplay },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`border-b border-white/10 px-6 py-6 md:border-b-0 md:border-r md:border-white/10 ${i === 2 ? "md:border-r-0" : ""}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-stardust/80">
                  {row.label}
                </p>
                <p className="mt-2 font-heading text-2xl font-bold tabular-nums md:text-3xl">
                  {fmtMoney(row.v)}
                </p>
              </div>
            ))}
          </section>

          <div className="mb-8 flex items-center justify-center gap-3 py-6 text-btc-orange/40">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-btc-orange/50" />
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-stardust">
              On-chain clarity
            </span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-btc-orange/50" />
          </div>

          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-white/10 shadow-card-ambient lg:grid-cols-3">
            {data.buckets.map((bucket, bi) => (
              <motion.article
                layout
                key={bucket.bucket}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: bi * 0.04, ...motionSnap }}
                className={`flex flex-col border-b border-white/10 bg-surface p-6 transition-all duration-300 lg:border-b-0 lg:border-r lg:border-white/10 lg:hover:-translate-y-1 lg:hover:border-btc-orange/40 lg:hover:shadow-card-hover ${bi === 2 ? "lg:border-r-0" : ""}`}
              >
                <div className="border-b border-white/10 pb-4">
                  <h2 className="font-heading text-2xl font-bold md:text-3xl">
                    {bucket.label}
                  </h2>
                </div>

                <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-0">
                  <AnimatePresence initial={false} mode="popLayout">
                    {bucket.sub_accounts.map((s) => (
                      <motion.li
                        layout
                        key={s.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={motionSnap}
                        className={`group relative border-b border-white/10 py-3 last:border-b-0 ${savingId === s.id ? "opacity-70" : ""}`}
                      >
                        <div className="flex gap-2 pr-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-body text-sm font-semibold text-white">
                              {s.name}
                            </p>
                            <label className="btc-kicker mt-2 block">
                              Balance
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                              {editingBalanceId !== s.id ? (
                                <button
                                  type="button"
                                  className={`min-h-[44px] w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-left font-mono text-base tabular-nums text-white transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-void ${
                                    balanceErrorId === s.id
                                      ? "ring-1 ring-btc-orange ring-offset-2 ring-offset-void"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setEditingBalanceId(s.id);
                                    setBalanceErrorId(null);
                                  }}
                                >
                                  {fmtMoney(
                                    Number(balanceDrafts[s.id] ?? s.balance)
                                  )}
                                </button>
                              ) : (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  autoFocus
                                  aria-invalid={balanceErrorId === s.id}
                                  className={`min-h-[44px] flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white shadow-inner transition-shadow focus-visible:border-btc-orange focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-void focus-visible:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.25)] ${
                                    balanceErrorId === s.id
                                      ? "border-btc-orange ring-1 ring-btc-orange"
                                      : ""
                                  }`}
                                  value={balanceDrafts[s.id] ?? ""}
                                  onChange={(e) => {
                                    setBalanceDrafts((prev) => ({
                                      ...prev,
                                      [s.id]: e.target.value,
                                    }));
                                    if (balanceErrorId === s.id) {
                                      setBalanceErrorId(null);
                                    }
                                  }}
                                  onBlur={() => onBalanceBlur(s.id)}
                                  onKeyDown={(e) => onBalanceKeyDown(s.id, e)}
                                />
                              )}
                              <AnimatePresence mode="wait">
                                {savedFlashId === s.id ? (
                                  <motion.span
                                    key="check"
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={motionSnap}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center text-btc-gold [filter:drop-shadow(0_0_6px_rgba(255,214,0,0.45))]"
                                    aria-label="Saved"
                                  >
                                    <Check
                                      className="h-5 w-5"
                                      strokeWidth={2}
                                    />
                                  </motion.span>
                                ) : (
                                  <span className="h-8 w-8 shrink-0" />
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          <div className="relative flex w-11 shrink-0 justify-end pt-8">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-stardust opacity-0 transition-all duration-200 group-hover:opacity-50 hover:!bg-btc-burnt/20 hover:!text-btc-orange hover:!opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:opacity-20"
                              aria-label={`Remove ${s.name}`}
                              disabled={deletingId === s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(s.id);
                              }}
                            >
                              <Trash2
                                className="h-5 w-5"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                            </button>
                            {deleteConfirmId === s.id ? (
                              <div
                                ref={deletePopoverRef}
                                className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-btc-orange/40 bg-surface/95 p-3 shadow-glow-orange backdrop-blur-md"
                              >
                                <p className="font-body text-xs text-stardust">
                                  Remove “{s.name}”? This cannot be undone.
                                </p>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    className="btc-btn-secondary min-h-0 flex-1 py-2 text-[10px]"
                                    onClick={() => setDeleteConfirmId(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="min-h-0 flex-1 rounded-full border border-btc-orange bg-surface py-2 font-body text-[10px] font-semibold uppercase tracking-widest text-btc-orange transition-colors hover:bg-btc-orange hover:text-white"
                                    onClick={() => removeSub(s.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="mt-4 border-t-2 border-white/10 pt-4">
                  {addingBucket === bucket.bucket ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={motionSnap}
                      className="flex flex-col gap-3"
                    >
                      <input
                        placeholder="Sub-account name"
                        className="btc-input"
                        value={newNames[bucket.bucket] ?? ""}
                        onChange={(e) =>
                          setNewNames((prev) => ({
                            ...prev,
                            [bucket.bucket]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btc-btn-primary flex-1"
                          onClick={() => addSub(bucket.bucket)}
                        >
                          Create
                        </button>
                        <button
                          type="button"
                          className="btc-btn-secondary flex-1"
                          onClick={() => {
                            setAddingBucket(null);
                            setNewNames((prev) => ({
                              ...prev,
                              [bucket.bucket]: "",
                            }));
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-surface/50 font-body text-xs font-semibold uppercase tracking-widest text-stardust transition-all duration-300 hover:border-btc-orange/50 hover:text-btc-orange hover:shadow-glow-orange"
                      onClick={() => setAddingBucket(bucket.bucket)}
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      Add sub-account
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
