"use client";

import { useState } from "react";
import StockPriceView from "./StockPriceView.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

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
      const res = await fetch(`${API_BASE}/stock?symbol=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "string" ? data.detail : data.error || "Failed to fetch quote";
        setError(msg);
        return;
      }
      setList((prev) => [
        { symbol: data.symbol, name: data.name ?? null, price: data.price },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Is the API running on port 3002?");
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
