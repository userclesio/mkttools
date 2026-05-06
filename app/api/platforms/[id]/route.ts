import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const platform = await db.platform.findUnique({
    where: { id },
    include: {
      credential: {
        select: { id: true, loginUrl: true, loginConfig: true, createdAt: true },
      },
    },
  });

  if (!platform) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(platform);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, url, iconUrl, description, isActive, username, password, loginUrl, loginConfig } =
    body;

  const platform = await db.platform.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(url && { url }),
      iconUrl: iconUrl ?? undefined,
      description: description ?? undefined,
      ...(isActive !== undefined && { isActive }),
    },
  });

  if (username && password) {
    await db.credential.upsert({
      where: { platformId: id },
      update: {
        username: encrypt(username),
        password: encrypt(password),
        loginUrl: loginUrl || null,
        loginConfig: loginConfig || null,
      },
      create: {
        platformId: id,
        username: encrypt(username),
        password: encrypt(password),
        loginUrl: loginUrl || null,
        loginConfig: loginConfig || null,
      },
    });
  }

  return NextResponse.json(platform);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.platform.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
