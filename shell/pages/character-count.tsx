// Upload route: financial CSV → API (SQLite). Parsing / preprocess: shell/lib/preprocessPurchases.ts
import dynamic from "next/dynamic";

const FinancialCsvImport = dynamic(
  () => import("../components/FinancialCsvImport"),
  { ssr: false }
);

export default function CharacterCountPage() {
  return <FinancialCsvImport />;
}
