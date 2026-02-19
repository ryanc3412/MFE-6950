"use client";

import { useState } from "react";
import CharacterCountView from "./CharacterCountView.js";

export default function CharacterCount() {
  const [value, setValue] = useState("");
  const [count, setCount] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setCount(value.length);
  }

  return (
    <CharacterCountView
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      count={count}
    />
  );
}
