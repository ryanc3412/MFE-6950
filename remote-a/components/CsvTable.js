"use client";

// remote-a: thin wrapper; shell passes parsed data as props (no fetch here)
import CsvTableView from "./CsvTableView.js";

export default function CsvTable({ headers = [], rows = [], fileName = null }) {
  return (
    <CsvTableView headers={headers} rows={rows} fileName={fileName} />
  );
}
