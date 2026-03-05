import dynamic from "next/dynamic";

const SquareNumber = dynamic(
  () => import("remote_a/SquareNumber").then((mod) => mod.default),
  { ssr: false }
);

export default function SquareNumberPage() {
  return <SquareNumber />;
}
