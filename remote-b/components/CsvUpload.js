"use client";

// remote-b: read user file in browser, parse to rows, tell shell via onParsed callback
import { useState } from "react";
import CsvUploadView from "./CsvUploadView.js";
import { parseCsv } from "./csvParse.js";

export default function CsvUpload({ onParsed }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  function handleFile(file) {
    setError(null);
    setStatus(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    // read file as text, then parse (shell never sees the raw file object)
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const { headers, rows } = parseCsv(text);
        if (headers.length === 0) {
          setError("The file appears empty.");
          return;
        }
        setStatus({
          fileName: file.name,
          headerCount: headers.length,
          rowCount: rows.length,
        });
        // hand off parsed table to host (shell stores this in context)
        if (typeof onParsed === "function") {
          onParsed({ headers, rows, fileName: file.name });
        }
      } catch (err) {
        setError(err.message || "Could not parse the CSV.");
      }
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file);
  }

  return (
    <CsvUploadView onFileChange={handleFile} status={status} error={error} />
  );
}
