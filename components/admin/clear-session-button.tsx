"use client";

import { useState } from "react";

export default function ClearSessionButton({ platformId }: { platformId: string }) {
  const [done, setDone] = useState(false);

  async function handleClear() {
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || "3002";
    await fetch(`http://localhost:${wsPort}/session/${platformId}`, { method: "DELETE" }).catch(() => {});
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      onClick={handleClear}
      className="text-xs px-3 py-1 rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
    >
      {done ? "✓ Limpo" : "Reset sessão"}
    </button>
  );
}
