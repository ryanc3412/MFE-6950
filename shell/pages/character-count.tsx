import dynamic from "next/dynamic";

const RemoteCharacterCount = dynamic(
  () => import("../components/RemoteCharacterCount"),
  { ssr: false }
);

export default function CharacterCountPage() {
  return <RemoteCharacterCount />;
}
