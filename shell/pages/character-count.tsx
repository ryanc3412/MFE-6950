// "upload csv" route: loads federated remote-b component (browser only, no ssr)
import dynamic from "next/dynamic";
import { useCsvData } from "../context/CsvDataContext";

const CsvUpload = dynamic(
  () => import("remote_b/CsvUpload").then((mod) => mod.default),
  { ssr: false }
);

export default function CharacterCountPage() {
  // when remote finishes parsing, push result into shell context
  const { setFromUpload } = useCsvData();
  return (
    <CsvUpload
      onParsed={({ headers, rows, fileName }) =>
        setFromUpload({ headers, rows, fileName })
      }
    />
  );
}
