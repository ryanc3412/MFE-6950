"use client";

// dumb ui: file input + optional success / error messages
export default function CsvUploadView({ onFileChange, status, error }) {
  return (
    <div className="tool-page">
      <label className="tool-label" htmlFor="csv-file">
        CSV file
      </label>
      <input
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        className="tool-input"
        style={{ padding: "0.5rem 0" }}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onFileChange(file);
          // reset input so picking the same file again still fires change
          e.target.value = "";
        }}
      />
      <p
        style={{
          fontSize: "0.875rem",
          color: "#64748b",
          marginBottom: "1rem",
          lineHeight: 1.5,
        }}
      >
        First row is used as column headers. After loading, open{" "}
        <strong>CSV table</strong> in the nav — the shell passes this data into
        remote-a via module federation props.
      </p>
      {status && (
        <div className="tool-result">
          Loaded <strong>{status.fileName}</strong>
          <br />
          {status.rowCount} data row{status.rowCount !== 1 ? "s" : ""},{" "}
          {status.headerCount} column{status.headerCount !== 1 ? "s" : ""}.
        </div>
      )}
      {error && <div className="tool-error">{error}</div>}
    </div>
  );
}
