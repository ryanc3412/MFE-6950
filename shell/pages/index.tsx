import dynamic from "next/dynamic";

const StoredItemsPanel = dynamic(
  () => import("../components/StoredItemsPanel"),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <h1>Home</h1>
      <StoredItemsPanel />
    </>
  );
}
