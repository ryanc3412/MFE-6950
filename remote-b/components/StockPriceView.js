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
    <div
      className="stock-price-page"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: "2rem",
        maxWidth: "28rem",
        margin: "0 auto",
      }}
    >
      <style>{`
        .stock-price-page input {
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .stock-price-page input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .stock-price-page button {
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease, transform 0.05s ease;
        }
        .stock-price-page button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }
        .stock-price-page button:active:not(:disabled) {
          transform: translateY(1px);
        }
        .stock-price-page button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>

      <form onSubmit={onSubmit}>
        <label
          htmlFor="symbol-input"
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            letterSpacing: "0.01em",
          }}
        >
          Stock ticker symbol
        </label>
        <input
          id="symbol-input"
          type="text"
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL, MSFT, GOOGL"
          style={{
            display: "block",
            width: "100%",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            backgroundColor: "#fff",
            color: "#111827",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.9375rem",
            fontWeight: 500,
            color: "#fff",
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: "8px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {loading ? "Loading…" : "Get price"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem 1.25rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#b91c1c",
            fontSize: "0.9375rem",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {list.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: "0.75rem",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Your lookups
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {list.map((item, i) => (
              <li
                key={i}
                style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "0.5rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {item.name ? (
                  <>
                    <div
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {item.symbol} · ${Number(item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                    }}
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
