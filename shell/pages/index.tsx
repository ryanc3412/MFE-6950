import dynamic from "next/dynamic";

const CategoryMonthBreakdown = dynamic(
  () => import("../components/CategoryMonthBreakdown"),
  { ssr: false }
);

export default function Home() {
  return <CategoryMonthBreakdown />;
}
