import Link from "next/link";
import { useRouter } from "next/router";

const SIDEBAR_WIDTH = 200;

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          background: "#f5f5f5",
          borderRight: "1px solid #e0e0e0",
          padding: "1rem 0",
        }}
      >
        <nav>
          <Link
            href="/"
            style={{
              display: "block",
              padding: "0.5rem 1rem",
              color: router.pathname === "/" ? "#111" : "#333",
              fontWeight: router.pathname === "/" ? 600 : 400,
              background:
                router.pathname === "/" ? "#e8e8e8" : "transparent",
            }}
          >
            Home
          </Link>
          <Link
            href="/square-number"
            style={{
              display: "block",
              padding: "0.5rem 1rem",
              color: router.pathname === "/square-number" ? "#111" : "#333",
              fontWeight: router.pathname === "/square-number" ? 600 : 400,
              background:
                router.pathname === "/square-number" ? "#e8e8e8" : "transparent",
            }}
          >
            Square Number
          </Link>
          <Link
            href="/character-count"
            style={{
              display: "block",
              padding: "0.5rem 1rem",
              color: router.pathname === "/character-count" ? "#111" : "#333",
              fontWeight: router.pathname === "/character-count" ? 600 : 400,
              background:
                router.pathname === "/character-count" ? "#e8e8e8" : "transparent",
            }}
          >
            Character Count
          </Link>
          <Link
            href="/hello-world"
            style={{
              display: "block",
              padding: "0.5rem 1rem",
              color: router.pathname === "/hello-world" ? "#111" : "#333",
              fontWeight: router.pathname === "/hello-world" ? 600 : 400,
              background:
                router.pathname === "/hello-world" ? "#e8e8e8" : "transparent",
            }}
          >
            Hello World
          </Link>
        </nav>
      </aside>
      <main
        style={{
          flex: 1,
          padding: "1.5rem",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
