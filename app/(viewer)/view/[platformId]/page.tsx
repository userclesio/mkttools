import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PlatformViewer from "@/components/platform-viewer";

export default async function ViewPage({ params }: { params: Promise<{ platformId: string }> }) {
  const session = await auth();
  const { platformId } = await params;

  const platform = await db.platform.findUnique({
    where: { id: platformId, isActive: true },
    select: { id: true, name: true },
  });

  if (!platform) notFound();

  const token = (session as { user?: { id?: string } })?.user?.id ?? "";

  return (
    <PlatformViewer
      platformId={platform.id}
      platformName={platform.name}
      token={token}
    />
  );
}
