import dynamic from "next/dynamic";

const Watchlist = dynamic(
  () => import("remote_b/Watchlist").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <p className="font-mono text-sm uppercase tracking-wider text-stardust">
        Loading watchlist…
      </p>
    ),
  }
);

export default function WatchlistPage() {
  return <Watchlist />;
}
