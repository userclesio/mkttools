import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";

export default async function ViewerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <SessionProvider>
      <div className="fixed inset-0 bg-black overflow-hidden">{children}</div>
    </SessionProvider>
  );
}
