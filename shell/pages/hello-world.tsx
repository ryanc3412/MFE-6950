import { useRef, useEffect } from "react";

export default function HelloWorldPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    mountedRef.current = true;
    let unmountFn: ((el: HTMLElement) => void) | null = null;

    import("remote_vue/VueApp").then((mod) => {
      if (!mountedRef.current || !containerRef.current) return;
      const api = mod.default ?? mod;
      const mountFn = typeof api?.mount === "function" ? api.mount : mod.mount;
      const unmountFnFromMod = typeof api?.unmount === "function" ? api.unmount : mod.unmount;
      if (typeof mountFn === "function") {
        mountFn(containerRef.current);
        if (typeof unmountFnFromMod === "function") unmountFn = unmountFnFromMod;
      }
    });

    return () => {
      mountedRef.current = false;
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
