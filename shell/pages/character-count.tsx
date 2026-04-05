// Upload route: bulk CSV + one-line manual entry. Parsing: shell/lib/preprocessPurchases.ts
import dynamic from "next/dynamic";

const FinancialCsvImport = dynamic(
  () => import("../components/FinancialCsvImport"),
  { ssr: false }
);
const StoredItemsPanel = dynamic(
  () => import("../components/StoredItemsPanel"),
  { ssr: false }
);

export default function CharacterCountPage() {
  return (
    <div className="tool-page" style={{ maxWidth: "36rem" }}>
      <FinancialCsvImport />
      <hr
        style={{
          margin: "2.25rem 0 1.5rem",
          border: 0,
          borderTop: "1px solid #e2e8f0",
        }}
      />
      <StoredItemsPanel />
    </div>
  );
}
