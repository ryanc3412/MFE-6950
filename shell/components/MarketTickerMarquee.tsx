"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBase } from "../lib/apiBase";

export type MarketQuote = {
  symbol: string;
  current_price: number | null;
  percent_change: number | null;
};

function formatTickerSegment(q: MarketQuote) {
  const price =
    q.current_price != null && Number.isFinite(q.current_price)
      ? `$${q.current_price.toFixed(2)}`
      : "—";
  const pct = q.percent_change;
  let pctStr = "(—)";
  if (pct != null && Number.isFinite(pct)) {
    const sign = pct > 0 ? "+" : "";
    pctStr = `(${sign}${pct.toFixed(1)}%)`;
  }
  return { price, pctStr, pct };
}

function TickerChip({ q }: { q: MarketQuote }) {
  const { price, pctStr, pct } = formatTickerSegment(q);
  const colorClass =
    pct == null || !Number.isFinite(pct)
      ? "text-stardust"
      : pct > 0
        ? "text-green-400 [filter:drop-shadow(0_0_8px_rgba(74,222,128,0.5))]"
        : pct < 0
          ? "text-red-400 [filter:drop-shadow(0_0_8px_rgba(248,113,113,0.5))]"
          : "text-stardust";

  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap border-r border-white/10 px-6 font-mono text-sm tabular-nums tracking-tight last:border-r-0 md:text-base">
      <span className="font-bold text-white">{q.symbol}</span>
      <span className="text-white/90">{price}</span>
      <span className={colorClass}>{pctStr}</span>
    </span>
  );
}

export default function MarketTickerMarquee() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(() => {
    return fetch(`${apiBase()}/api/market/quotes`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: { quotes?: MarketQuote[] }) => {
        setQuotes(Array.isArray(d.quotes) ? d.quotes : []);
      })
      .catch(() => {
        setQuotes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchQuotes();
    const id = window.setInterval(() => void fetchQuotes(), 90_000);
    return () => window.clearInterval(id);
  }, [fetchQuotes]);

  useEffect(() => {
    const onWatchlist = () => void fetchQuotes();
    window.addEventListener("WATCHLIST_UPDATED", onWatchlist);
    return () => window.removeEventListener("WATCHLIST_UPDATED", onWatchlist);
  }, [fetchQuotes]);

  if (!loading && quotes.length === 0) {
    return (
      <div
        className="mb-10 flex min-h-[3.5rem] items-center justify-center border-y border-white/10 bg-surface/90 px-4 py-4 shadow-[inset_0_0_40px_-20px_rgba(247,147,26,0.12)]"
        role="status"
        aria-live="polite"
      >
        <p className="text-center font-mono text-xs font-medium uppercase tracking-[0.2em] text-stardust md:text-sm">
          AWAITING TICKER DATA — ADD STOCKS IN MARKET WATCH
        </p>
      </div>
    );
  }

  return (
    <div
      className="mb-10 flex items-stretch border-y border-white/10 bg-surface/90 shadow-[inset_0_0_40px_-20px_rgba(247,147,26,0.15)]"
      aria-label="Live market watch ticker"
    >
      <div className="hidden shrink-0 flex-col items-center justify-center border-r border-white/10 px-3 py-2 sm:flex">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-btc-burnt to-btc-orange px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-glow-orange">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-btc-gold opacity-50 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-btc-gold" />
          </span>
          Live
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden py-3">
        {loading && quotes.length === 0 ? (
          <div className="flex min-h-[2.75rem] items-center justify-center font-mono text-xs uppercase tracking-widest text-stardust">
            Loading ticker…
          </div>
        ) : (
          <div className="flex w-max max-w-none animate-marquee will-change-transform motion-reduce:animate-none">
            {[0, 1].map((pass) => (
              <div
                key={pass}
                className="flex shrink-0 items-center"
                aria-hidden={pass === 1}
              >
                {quotes.map((q, i) => (
                  <TickerChip key={`${pass}-${q.symbol}-${i}`} q={q} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
