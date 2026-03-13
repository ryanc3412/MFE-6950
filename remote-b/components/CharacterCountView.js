"use client";

export default function CharacterCountView({
  value,
  onChange,
  onSubmit,
  count,
}) {
  return (
    <div className="tool-page">
      <form onSubmit={onSubmit}>
        <label
          htmlFor="text-input"
          className="tool-label"
        >
          Enter text
        </label>
        <textarea
          id="text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="tool-input"
        />
        <button
          type="submit"
          className="tool-button"
        >
          Count characters
        </button>
      </form>
      {count !== null && (
        <div className="tool-result">
          Character count: {count}
        </div>
      )}
    </div>
  );
}
