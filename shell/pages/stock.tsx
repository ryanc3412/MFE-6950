import dynamic from "next/dynamic";

const StockPrice = dynamic(
  () => import("remote_b/StockPrice").then((mod) => mod.default),
  { ssr: false }
);

export default function StockPage() {
  return <StockPrice />;
}
