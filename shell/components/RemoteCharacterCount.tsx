"use client";

import { useEffect, useState } from "react";

export default function RemoteCharacterCount() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    import("remote_b/CharacterCount")
      .then((mod) => setComponent(() => mod.default))
      .catch(setError);
  }, []);

  if (error) {
    return (
      <p style={{ color: "crimson" }}>
        Failed to load remote: {error.message}. Is remote-b running on port
        3003?
      </p>
    );
  }

  if (!Component) {
    return <p>Loading remote…</p>;
  }

  return <Component />;
}
