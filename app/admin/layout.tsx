import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") redirect("/dashboard");

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
        <header
          className="h-14 flex items-center px-6 border-b shrink-0"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <Link href="/dashboard" className="font-bold text-white text-lg mr-6">
            🚀 MktTools
          </Link>
          <nav className="flex items-center gap-4 flex-1">
            <Link
              href="/dashboard"
              className="text-sm transition-colors hover:text-white"
              style={{ color: "var(--muted)" }}
            >
              Ferramentas
            </Link>
            <Link href="/admin/platforms" className="text-sm text-indigo-400 font-medium">
              Admin
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Admin
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </SessionProvider>
  );
}
