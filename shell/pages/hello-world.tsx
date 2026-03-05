import { useRef, useEffect } from "react";

const REMOTE_VUE_ENTRY = "http://localhost:3004/assets/remoteEntry.js";

export default function HelloWorldPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const unmountRef = useRef<((el: HTMLElement) => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    mountedRef.current = true;

    (async () => {
      try {
        // Load as ES module (dynamic import of URL) so remoteEntry's import.meta works.
        const entry = await import(/* webpackIgnore: true */ REMOTE_VUE_ENTRY);
        if (!mountedRef.current || !containerRef.current) return;
        entry.init?.({});
        const factory = await entry.get("./VueApp");
        if (!mountedRef.current || !containerRef.current) return;
        const mod = typeof factory === "function" ? factory() : factory;
        if (!mountedRef.current || !containerRef.current) return;
        const api = mod?.default ?? mod;
        const mountFn = typeof api?.mount === "function" ? api.mount : api?.mount;
        const unmountFn = typeof api?.unmount === "function" ? api.unmount : api?.unmount;
        if (typeof mountFn === "function") {
          mountFn(containerRef.current!);
          if (typeof unmountFn === "function") unmountRef.current = unmountFn;
        }
      } catch (err) {
        console.error("Failed to load Vue remote:", err);
      }
    })();

    return () => {
      mountedRef.current = false;
      const unmountFn = unmountRef.current;
      unmountRef.current = null;
      if (unmountFn && el) unmountFn(el);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ minHeight: "120px" }}
      data-mount="remote-vue"
    />
  );
}
