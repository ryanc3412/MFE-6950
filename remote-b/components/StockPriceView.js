"use client";

export default function StockPriceView({
  symbol,
  onSymbolChange,
  onSubmit,
  loading,
  error,
  list,
}) {
  return (
    <div className="tool-page">
      <form onSubmit={onSubmit}>
        <label
          htmlFor="symbol-input"
          className="tool-label"
        >
          Stock ticker symbol
        </label>
        <input
          id="symbol-input"
          type="text"
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL, MSFT, GOOGL"
          className="tool-input"
        />
        <button
          type="submit"
          disabled={loading}
          className="tool-button"
        >
          {loading ? "Loading…" : "Get price"}
        </button>
      </form>

      {error && (
        <div className="tool-error">
          {error}
        </div>
      )}

      {list.length > 0 && (
        <div className="tool-list">
          <div className="tool-list-title">
            Your lookups
          </div>
          <ul className="tool-list-items">
            {list.map((item, i) => (
              <li
                key={i}
                className="tool-list-item"
              >
                {item.name ? (
                  <>
                    <div
                      className="tool-list-name"
                    >
                      {item.name}
                    </div>
                    <div
                      className="tool-list-price"
                    >
                      {item.symbol} · ${Number(item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                ) : (
                  <div
                    className="tool-list-price"
                  >
                    {item.symbol} · ${Number(item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
