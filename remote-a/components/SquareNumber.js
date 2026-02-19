"use client";

import { useState } from "react";
import SquareNumberView from "./SquareNumberView.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function SquareNumber() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const num = Number(value);
    if (value.trim() === "" || Number.isNaN(num)) {
      setError("Please enter a valid number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/square?n=${encodeURIComponent(num)}`);
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d) => d.msg || JSON.stringify(d)).join(" ")
          : data.detail || data.error || "Request failed";
        setError(msg);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to reach the API. Is it running on port 3002?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SquareNumberView
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      result={result}
      error={error}
      loading={loading}
    />
  );
}
