"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm px-3 py-1 rounded-lg border border-white/10 transition-colors hover:bg-white/5"
      style={{ color: "var(--muted)" }}
    >
      Sair
    </button>
  );
}
