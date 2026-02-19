import dynamic from "next/dynamic";

const RemoteSquareNumber = dynamic(
  () => import("../components/RemoteSquareNumber"),
  { ssr: false }
);

export default function SquareNumberPage() {
  return <RemoteSquareNumber />;
}
