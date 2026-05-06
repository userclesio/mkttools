import { db } from "@/lib/db";
import Link from "next/link";
import DeletePlatformButton from "@/components/admin/delete-platform-button";
import ClearSessionButton from "@/components/admin/clear-session-button";

export default async function AdminPlatformsPage() {
  const platforms = await db.platform.findMany({
    include: { credential: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plataformas</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Gerencie as ferramentas disponíveis para os usuários
          </p>
        </div>
        <Link
          href="/admin/platforms/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "var(--primary)" }}
        >
          + Nova Plataforma
        </Link>
      </div>

      {platforms.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <p className="text-gray-400">Nenhuma plataforma cadastrada.</p>
          <Link
            href="/admin/platforms/new"
            className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--primary)" }}
          >
            Cadastrar primeira plataforma
          </Link>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">URL</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Credenciais</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{p.url}</td>
                  <td className="px-4 py-3">
                    {p.credential ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                        Configuradas
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Sem credenciais
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="text-xs text-green-400">● Ativo</span>
                    ) : (
                      <span className="text-xs text-gray-500">● Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/platforms/${p.id}/edit`}
                        className="text-xs px-3 py-1 rounded border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        Editar
                      </Link>
                      <ClearSessionButton platformId={p.id} />
                      <DeletePlatformButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
