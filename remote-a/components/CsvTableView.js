"use client";

// presentational: show filename + either empty hint or html table from props
export default function CsvTableView({ headers, rows, fileName }) {
  const hasData = headers.length > 0;

  return (
    <div className="tool-page" style={{ maxWidth: "56rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
        }}
      >
        CSV table
      </h1>
      {fileName ? (
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
          {fileName}
        </p>
      ) : null}
      {!hasData ? (
        <div className="tool-result">
          No CSV loaded yet. Upload a file on the <strong>Upload CSV</strong>{" "}
          page (remote-b). The shell stores the parsed rows and passes them here
          as props to this remote-a federated module.
        </div>
      ) : (
        // one column per header, one row per data line
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left",
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid #e2e8f0",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "0.65rem 1rem",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
