"use client";

import { useEffect, useState } from "react";

export default function RemoteSquareNumber() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    import("remote_a/SquareNumber")
      .then((mod) => setComponent(() => mod.default))
      .catch(setError);
  }, []);

  if (error) {
    return (
      <p style={{ color: "crimson" }}>
        Failed to load remote: {error.message}. Is remote-a running on port
        3001?
      </p>
    );
  }

  if (!Component) {
    return <p>Loading remote…</p>;
  }

  return <Component />;
}
