// "csv table" route: loads federated remote-a component (browser only)
import dynamic from "next/dynamic";
import { useCsvData } from "../context/CsvDataContext";

const CsvTable = dynamic(
  () => import("remote_a/CsvTable").then((mod) => mod.default),
  { ssr: false }
);

export default function SquareNumberPage() {
  // read whatever the shell last stored from upload; pass into remote as plain props
  const { headers, rows, fileName } = useCsvData();
  return (
    <CsvTable headers={headers} rows={rows} fileName={fileName} />
  );
}
