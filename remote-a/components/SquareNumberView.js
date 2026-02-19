"use client";

export default function SquareNumberView({
  value,
  onChange,
  onSubmit,
  result,
  error,
  loading,
}) {
  return (
    <div style={{ padding: "1rem", maxWidth: "20rem" }}>
      <form onSubmit={onSubmit}>
        <label htmlFor="number-input" style={{ display: "block", marginBottom: "0.5rem" }}>
          Enter a number
        </label>
        <input
          id="number-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          style={{
            display: "block",
            width: "100%",
            padding: "0.5rem",
            marginBottom: "0.5rem",
            boxSizing: "border-box",
          }}
        />
        <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem" }}>
          {loading ? "…" : "Square it"}
        </button>
      </form>
      {result !== null && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "var(--background)",
            border: "1px solid var(--foreground)",
            borderRadius: "4px",
          }}
        >
          Result: {result.number}² = {result.square}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            color: "crimson",
            border: "1px solid currentColor",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
