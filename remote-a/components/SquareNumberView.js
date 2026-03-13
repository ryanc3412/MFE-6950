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
    <div className="tool-page">
      <form onSubmit={onSubmit}>
        <label htmlFor="number-input" className="tool-label">
          Enter a number
        </label>
        <input
          id="number-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className="tool-input"
        />
        <button type="submit" disabled={loading} className="tool-button">
          {loading ? "…" : "Square it"}
        </button>
      </form>
      {result !== null && (
        <div className="tool-result">
          Result: {result.number}² = {result.square}
        </div>
      )}
      {error && (
        <div className="tool-error">
          {error}
        </div>
      )}
    </div>
  );
}
