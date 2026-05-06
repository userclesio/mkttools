import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PlatformForm from "@/components/admin/platform-form";

export default async function EditPlatformPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const platform = await db.platform.findUnique({
    where: { id },
    include: {
      credential: { select: { loginUrl: true, loginConfig: true } },
    },
  });

  if (!platform) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Editar Plataforma</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          {platform.name}
        </p>
      </div>
      <PlatformForm initialData={platform} />
    </div>
  );
}
