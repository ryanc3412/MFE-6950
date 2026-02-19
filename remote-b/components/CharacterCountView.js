"use client";

export default function CharacterCountView({
  value,
  onChange,
  onSubmit,
  count,
}) {
  return (
    <div style={{ padding: "1rem", maxWidth: "20rem" }}>
      <form onSubmit={onSubmit}>
        <label
          htmlFor="text-input"
          style={{ display: "block", marginBottom: "0.5rem" }}
        >
          Enter text
        </label>
        <textarea
          id="text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{
            display: "block",
            width: "100%",
            padding: "0.5rem",
            marginBottom: "0.5rem",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
        <button
          type="submit"
          style={{ padding: "0.5rem 1rem" }}
        >
          Count characters
        </button>
      </form>
      {count !== null && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "var(--background)",
            border: "1px solid var(--foreground)",
            borderRadius: "4px",
          }}
        >
          Character count: {count}
        </div>
      )}
    </div>
  );
}
