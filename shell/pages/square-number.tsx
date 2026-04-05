// "CSV table" nav: ledger from database (monthly breakdown + full list)
import dynamic from "next/dynamic";

const LedgerOverview = dynamic(
  () => import("../components/LedgerOverview"),
  { ssr: false }
);

export default function SquareNumberPage() {
  return <LedgerOverview />;
}
