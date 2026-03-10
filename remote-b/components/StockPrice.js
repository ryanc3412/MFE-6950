"use client";

import { useState } from "react";
import StockPriceView from "./StockPriceView.js";

export default function StockPrice() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [list, setList] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch quote");
        return;
      }
      setList((prev) => [
        { symbol: data.symbol, name: data.name ?? null, price: data.price },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StockPriceView
      symbol={symbol}
      onSymbolChange={setSymbol}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      list={list}
    />
  );
}
