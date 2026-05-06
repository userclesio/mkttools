"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePlatformButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Deletar "${name}"? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    await fetch(`/api/platforms/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs px-3 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "Deletar"}
    </button>
  );
}
