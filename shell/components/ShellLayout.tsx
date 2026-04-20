"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editionLine, setEditionLine] = useState("");

  useEffect(() => {
    setEditionLine(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  const items = [
    { href: "/", label: "Command Center" },
    { href: "/transactions", label: "Transactions" },
    { href: "/watchlist", label: "Market Watch" },
    { href: "/hello-world", label: "Hello World (Vue)" },
  ];

  return (
    <div className="relative flex min-h-screen bg-void text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-grid-fade opacity-80"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 animate-float rounded-full bg-btc-orange/10 blur-[120px] motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-20 bottom-0 h-80 w-80 rounded-full bg-btc-gold/10 blur-[100px]"
        aria-hidden
      />

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-void/90 px-4 backdrop-blur-lg lg:hidden">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-stardust">
            PFOS · {editionLine || "—"}
          </p>
          <p className="font-heading text-lg font-bold leading-tight tracking-tight">
            <span className="text-gradient-btc">Personal</span> Finance
          </p>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-all duration-200 hover:border-btc-orange/50 hover:bg-white/10 hover:shadow-glow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </header>

      <aside className="relative z-10 hidden w-60 shrink-0 flex-col border-r border-white/10 bg-surface/60 backdrop-blur-xl lg:flex">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <span
              className="relative flex h-2 w-2"
              aria-hidden
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-btc-orange opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-btc-orange" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-stardust">
              Live · {editionLine || "—"}
            </p>
          </div>
          <p className="mt-3 font-heading text-xl font-bold leading-tight">
            Personal
            <br />
            <span className="text-gradient-value">Finance OS</span>
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-btc-orange/90">
            Module federation
          </p>
        </div>
        <nav
          className="flex flex-col border-b border-white/10 py-2"
          aria-label="Primary"
        >
          {items.map(({ href, label }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`mx-2 my-0.5 rounded-xl px-3 py-3 font-mono text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                  active
                    ? "border border-btc-orange/40 bg-btc-burnt/20 text-btc-orange shadow-glow-orange"
                    : "border border-transparent text-stardust hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4">
          <p className="font-mono text-[10px] leading-relaxed text-stardust/90">
            Encrypted desk · Local-first ledger
          </p>
        </div>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-void/70 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed bottom-0 left-0 top-14 z-40 w-72 border-r border-white/10 bg-surface/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav
          className="flex flex-col gap-1 p-3"
          aria-label="Mobile primary"
        >
          {items.map(({ href, label }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider ${
                  active
                    ? "bg-btc-burnt/25 text-btc-orange shadow-glow-orange"
                    : "text-stardust hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="relative z-10 min-w-0 flex-1 border-white/5 lg:border-l">
        <div className="btc-container py-8 pt-20 lg:pt-12">{children}</div>
      </main>
    </div>
  );
}
