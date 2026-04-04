"use client";

import { useState } from "react";
import StockPriceView from "./StockPriceView.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

// this is the StockPrice component
export default function StockPrice() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [list, setList] = useState([]);

  // this is the function to handle the form submission
  async function handleSubmit(e) {
    e.preventDefault();
    const s = symbol.trim().toUpperCase();
    if (!s) return; // if the symbol is empty, return
    setError(null);
    setLoading(true); // set the loading state to true
    try {
      const res = await fetch(`${API_BASE}/stock?symbol=${encodeURIComponent(s)}`);
      const data = await res.json(); // get the data from the API
      if (!res.ok) {
        const msg = typeof data.detail === "string" ? data.detail : data.error || "Failed to fetch quote";
        setError(msg); // set the error state to the message
        return;
      }
      setList((prev) => [
        { symbol: data.symbol, name: data.name ?? null, price: data.price }, // add the data to the list
        ...prev, // add the previous list to the new list
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Is the API running on port 3002?");
    } finally { // finally, set the loading state to false
      setLoading(false);
    }
  }

  return ( // return the StockPriceView component
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
