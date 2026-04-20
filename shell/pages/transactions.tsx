import dynamic from "next/dynamic";

const TransactionEngine = dynamic(
  () => import("remote_a/TransactionEngine").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <p className="font-mono text-sm uppercase tracking-wider text-stardust">
        Loading transaction engine…
      </p>
    ),
  }
);

export default function TransactionsPage() {
  return <TransactionEngine />;
}
