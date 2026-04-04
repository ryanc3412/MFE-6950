// shared csv state for the whole shell: react state + optional localstorage backup
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// shape of parsed data we keep (not the raw file)
export type CsvPayload = {
  headers: string[];
  rows: string[][];
  fileName?: string | null;
};

type CsvDataContextValue = {
  headers: string[];
  rows: string[][];
  fileName: string | null;
  setFromUpload: (payload: CsvPayload) => void;
};

const CsvDataContext = createContext<CsvDataContextValue | null>(null);

// browser key for json snapshot of headers/rows/filename
const STORAGE_KEY = "mfe-minimal:csv-upload";

// try to restore last upload after refresh or new tab
function loadStoredCsv(): CsvPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const { headers, rows, fileName } = data as Record<string, unknown>;
    if (!Array.isArray(headers) || !Array.isArray(rows)) return null;
    if (!headers.every((h) => typeof h === "string")) return null;
    if (
      !rows.every(
        (r) => Array.isArray(r) && r.every((c) => typeof c === "string")
      )
    ) {
      return null;
    }
    return {
      headers,
      rows,
      fileName:
        fileName === null || fileName === undefined
          ? null
          : String(fileName),
    };
  } catch {
    return null;
  }
}

// save parsed table so it survives reload (ignore if quota / private mode fails)
function persistCsv(payload: CsvPayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        headers: payload.headers,
        rows: payload.rows,
        fileName: payload.fileName ?? null,
      })
    );
  } catch {
    // quota or private mode — memory still ok for this session
  }
}

export function CsvDataProvider({ children }: { children: ReactNode }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // on first mount, pull from localstorage if present
  useEffect(() => {
    const stored = loadStoredCsv();
    if (!stored) return;
    setHeaders(stored.headers);
    setRows(stored.rows);
    setFileName(stored.fileName ?? null);
  }, []);

  // called from upload page: update react
  const setFromUpload = useCallback((payload: CsvPayload) => {
    setHeaders(payload.headers);
    setRows(payload.rows);
    setFileName(payload.fileName ?? null);
    persistCsv(payload);
  }, []);

  // single object every consumer reads (headers, rows, filename, setter)
  const value = useMemo(
    () => ({
      headers,
      rows,
      fileName,
      setFromUpload,
    }),
    [headers, rows, fileName, setFromUpload]
  );

  return (
    <CsvDataContext.Provider value={value}>{children}</CsvDataContext.Provider>
  );
}

// hook for any page under the provider (upload writes, table reads)
export function useCsvData() {
  const ctx = useContext(CsvDataContext);
  if (!ctx) {
    throw new Error("useCsvData must be used within CsvDataProvider");
  }
  return ctx;
}
