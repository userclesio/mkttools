import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import PlatformCard from "@/components/platform-card";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const platforms = await db.platform.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      url: true,
      iconUrl: true,
      description: true,
      credential: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Suas Ferramentas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Clique em <strong className="text-gray-400">Abrir</strong> para acessar qualquer
          plataforma com login automático
        </p>
      </div>

      {platforms.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <div className="text-4xl mb-3">🔧</div>
          <p className="text-gray-400">Nenhuma ferramenta disponível ainda.</p>
          {isAdmin && (
            <a
              href="/admin/platforms/new"
              className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: "var(--primary)" }}
            >
              Adicionar primeira ferramenta
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {platforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              id={platform.id}
              name={platform.name}
              url={platform.url}
              iconUrl={platform.iconUrl}
              description={platform.description}
              hasCredentials={!!platform.credential}
            />
          ))}
        </div>
      )}
    </div>
  );
}
