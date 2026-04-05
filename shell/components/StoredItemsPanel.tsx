"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBase } from "../lib/apiBase";

export type StoredItem = {
  id: number;
  item_date: string;
  price: number;
  comment: string;
  created_at: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function StoredItemsPanel() {
  const [items, setItems] = useState<StoredItem[]>([]);
  const [itemDate, setItemDate] = useState(todayIsoDate);
  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetch(`${apiBase()}/db/items`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { items?: StoredItem[] }) => setItems(d.items ?? []))
      .catch(() =>
        setError("Could not load items. Is the API running on port 3002?")
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(() => {
        setPrice("");
        setComment("");
        setItemDate(todayIsoDate());
        load();
      })
      .catch(() => setError("Save failed."))
      .finally(() => setLoading(false));
  }

  return (
    <section style={{ marginTop: "2rem", maxWidth: 560 }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
        Stored items (SQLite)
      </h2>
      <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Each row is a <strong>date</strong>, <strong>price</strong>, and{" "}
        <strong>comment</strong> saved in the API database file (
        <code>api/data/</code> when you use Docker). This is separate from CSV
        data, which still lives only in the shell.
      </p>
      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: "0.65rem",
          marginBottom: "1.25rem",
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
            placeholder="e.g. 12.99"
            inputMode="decimal"
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
      <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
        {items.length === 0 ? (
          <li style={{ color: "#666" }}>No items yet.</li>
        ) : (
          items.map((it) => (
            <li key={it.id} style={{ marginBottom: "0.75rem" }}>
              <div>
                <strong>{it.item_date}</strong>
                <span style={{ marginLeft: "0.5rem" }}>
                  {Number(it.price).toFixed(2)}
                </span>
              </div>
              {it.comment ? (
                <div style={{ color: "#333", marginTop: "0.2rem" }}>
                  {it.comment}
                </div>
              ) : null}
              <div style={{ color: "#888", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                saved {it.created_at} · #{it.id}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
