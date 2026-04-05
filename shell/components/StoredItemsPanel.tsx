"use client";

import { useState } from "react";
import { apiBase } from "../lib/apiBase";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function StoredItemsPanel() {
  const [itemDate, setItemDate] = useState(todayIsoDate);
  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("other");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = price.trim();
    if (!p) {
      setError("Enter a price.");
      return;
    }
    const num = Number(p);
    if (Number.isNaN(num)) {
      setError("Price must be a number.");
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase()}/db/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_date: itemDate.trim(),
        price: num,
        comment: comment.trim(),
        category: category.trim() || "other",
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(() => {
        setPrice("");
        setComment("");
        setCategory("other");
        setItemDate(todayIsoDate());
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2000);
      })
      .catch(() => setError("Save failed."))
      .finally(() => setLoading(false));
  }

  return (
    <section style={{ marginTop: 0, maxWidth: 560 }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
        Add one line at a time
      </h2>
      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: "0.65rem",
          marginBottom: "0.5rem",
          maxWidth: 400,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#444" }}>Date</span>
          <input
            type="date"
            value={itemDate}
            onChange={(e) => setItemDate(e.target.value)}
            style={{ padding: "0.4rem 0.6rem" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#444" }}>Price</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. -12.99 or 100"
            inputMode="decimal"
            style={{ padding: "0.4rem 0.6rem" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#444" }}>Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. groceries, gas, eating out"
            style={{ padding: "0.4rem 0.6rem" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#444" }}>Comment</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What this entry is for"
            rows={3}
            style={{ padding: "0.4rem 0.6rem", resize: "vertical" }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ justifySelf: "start" }}>
          {loading ? "Saving…" : "Add item"}
        </button>
      </form>
      {error ? (
        <p style={{ color: "#b00020", marginBottom: "0.75rem" }}>{error}</p>
      ) : null}
      {savedFlash ? (
        <div className="tool-result" style={{ marginTop: "0.5rem" }}>
          Saved.
        </div>
      ) : null}
    </section>
  );
}
