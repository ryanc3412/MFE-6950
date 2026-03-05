import dynamic from "next/dynamic";

const CharacterCount = dynamic(
  () => import("remote_b/CharacterCount").then((mod) => mod.default),
  { ssr: false }
);

export default function CharacterCountPage() {
  return <CharacterCount />;
}
