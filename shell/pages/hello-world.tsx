import { useRef, useEffect } from "react";

// URL of the Vue remote's "entry" script. The browser fetches this to load the Vue app.
const REMOTE_VUE_ENTRY = "http://localhost:3004/assets/remoteEntry.js";

export default function HelloWorldPage() {
  // The div we render below. We pass this to Vue so it can draw inside it.
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const unmountRef = useRef<((el: HTMLElement) => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return; // No div yet; nothing to do.

    mountedRef.current = true;

    (async () => {
      try {
        // 1. Fetch the remote's entry script from the Vue server (3004). Don't let Webpack bundle it.
        const entry = await import(/* webpackIgnore: true */ REMOTE_VUE_ENTRY);
        if (!mountedRef.current || !containerRef.current) return; // User left the page already.
        entry.init?.({}); // initialize the remote

        // ask the remote for the VueApp module
        // which is the mount/unmount from remote-vue's mount.ts
        // ******NEED TO UNDERSTAND THIS MORE
        const factory = await entry.get("./VueApp");
        if (!mountedRef.current || !containerRef.current) return;
        const mod = typeof factory === "function" ? factory() : factory;
        if (!mountedRef.current || !containerRef.current) return;
        const api = mod?.default ?? mod;
        const mountFn = typeof api?.mount === "function" ? api.mount : api?.mount;
        const unmountFn = typeof api?.unmount === "function" ? api.unmount : api?.unmount;

        // if the mount function is a function
        if (typeof mountFn === "function") {
          // tell the Vue app to mount (draw) into our div. User sees "Hello World" here
          mountFn(containerRef.current!);
          if (typeof unmountFn === "function") unmountRef.current = unmountFn; // Save for cleanup.
        }
      } catch (err) {
        console.error("Failed to load Vue remote:", err);
      }
    })();

    // When the user navigates away, React tells the Vue app to unmount
    // by returning a function from useEffect React treats it as a cleanup function
    return () => {
      mountedRef.current = false;
      const unmountFn = unmountRef.current;
      unmountRef.current = null;
      if (unmountFn && el) unmountFn(el);
    };
  }, []);

  // Just an empty div. Vue will render its "Hello World" content inside it after we call mount().
  return (
    // this is the div that the Vue app will mount into
    <div
      ref={containerRef}
      style={{ minHeight: "120px" }}
      data-mount="remote-vue"
    />
  );
}
