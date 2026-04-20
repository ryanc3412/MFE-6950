"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function Watchlist() {
  const [symbols, setSymbols] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return fetch(`${API_BASE}/stocks`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => setSymbols(d.symbols ?? []))
      .catch(() =>
        setError("Could not load watchlist. Is the API running on port 3002?")
      )
      .finally(() => setLoading(false));
  }, []);

  function notifyWatchlistUpdated() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("WATCHLIST_UPDATED"));
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      for (const row of symbols) {
        const sym = row.symbol;
        try {
          const res = await fetch(
            `${API_BASE}/stock?symbol=${encodeURIComponent(sym)}`
          );
          const data = await res.json();
          if (res.ok) {
            next[sym] = {
              price: data.price,
              name: data.name,
              ok: true,
            };
          } else {
            next[sym] = {
              ok: false,
              detail:
                typeof data.detail === "string"
                  ? data.detail
                  : "Quote unavailable",
            };
          }
        } catch {
          next[sym] = { ok: false, detail: "Network error" };
        }
        if (cancelled) return;
      }
      if (!cancelled) setQuotes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [symbols]);

  function addSymbol(e) {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (!s) return;
    setBusy("add");
    setError(null);
    fetch(`${API_BASE}/stocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: s }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg =
            typeof data.detail === "string" ? data.detail : `HTTP ${r.status}`;
          throw new Error(msg);
        }
        return data;
      })
      .then(() => {
        setInput("");
        notifyWatchlistUpdated();
        return load();
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not add symbol.")
      )
      .finally(() => setBusy(null));
  }

  function removeSymbol(sym) {
    setBusy(sym);
    setError(null);
    fetch(`${API_BASE}/stocks/${encodeURIComponent(sym)}`, {
      method: "DELETE",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        notifyWatchlistUpdated();
        return load();
      })
      .catch(() => setError("Could not remove symbol."))
      .finally(() => setBusy(null));
  }

  return (
    <div className="max-w-lg space-y-8">
      <header className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-stardust">
          Markets desk
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Market{" "}
          <span className="bg-gradient-to-r from-btc-orange to-btc-gold bg-clip-text text-transparent">
            watch
          </span>
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-stardust">
          Tickers persist in SQLite. Live quotes require{" "}
          <code className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-xs text-btc-gold">
            FINNHUB_API_KEY
          </code>{" "}
          on the API.
        </p>
      </header>

      <section className="glass-panel">
        <form onSubmit={addSymbol} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-[44px] flex-1 rounded-lg border-0 border-b-2 border-white/20 bg-black/50 px-4 py-2 font-mono text-sm text-white placeholder:text-white/30 focus-visible:border-btc-orange focus-visible:outline-none focus-visible:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)]"
            placeholder="Ticker e.g. AAPL"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={16}
          />
          <button
            type="submit"
            disabled={busy === "add"}
            className="min-h-[44px] shrink-0 rounded-full bg-gradient-to-r from-btc-burnt to-btc-orange px-6 font-body text-xs font-bold uppercase tracking-wider text-white shadow-glow-orange transition-all duration-300 hover:scale-105 hover:shadow-glow-orange-lg disabled:opacity-50 disabled:hover:scale-100"
          >
            {busy === "add" ? "Adding…" : "Add"}
          </button>
        </form>
        {error ? (
          <p className="mt-3 rounded-xl border-2 border-btc-orange/70 bg-btc-burnt/10 p-3 font-body text-sm text-btc-orange">
            {error}
          </p>
        ) : null}
      </section>

      <section className="glass-panel">
        <h2 className="font-heading text-2xl font-bold text-white">
          Your watchlist
        </h2>
        {loading ? (
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-stardust">
            Loading…
          </p>
        ) : symbols.length === 0 ? (
          <p className="mt-4 font-body text-sm text-stardust/90">
            No symbols yet. File a ticker above.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
            {symbols.map((row) => {
              const sym = row.symbol;
              const q = quotes[sym];
              return (
                <li
                  key={sym}
                  className="flex items-center justify-between gap-3 bg-surface/50 px-4 py-3 transition-colors duration-200 hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-lg font-bold text-white">
                      {sym}
                    </p>
                    {q?.ok ? (
                      <p className="truncate font-body text-xs text-stardust/90">
                        {q.name || "—"} ·{" "}
                        <span className="font-mono tabular-nums text-btc-gold">
                          ${q.price?.toFixed(2)}
                        </span>
                      </p>
                    ) : q ? (
                      <p className="font-mono text-xs text-btc-orange">
                        {q.detail || "No quote"}
                      </p>
                    ) : (
                      <p className="font-mono text-xs text-stardust">
                        Fetching quote…
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSymbol(sym)}
                    disabled={busy === sym}
                    className="min-h-[44px] shrink-0 rounded-full border-2 border-btc-orange/60 bg-transparent px-4 font-body text-xs font-semibold uppercase tracking-wider text-btc-orange transition-all duration-300 hover:bg-btc-orange hover:text-void hover:shadow-glow-orange disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
