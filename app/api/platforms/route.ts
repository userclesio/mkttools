import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platforms = await db.platform.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      url: true,
      iconUrl: true,
      description: true,
      isActive: true,
      createdAt: true,
      credential: {
        select: { id: true, loginUrl: true, loginConfig: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(platforms);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, url, iconUrl, description, username, password, loginUrl, loginConfig } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
  }

  const platform = await db.platform.create({
    data: {
      name,
      url,
      iconUrl: iconUrl || null,
      description: description || null,
      ...(username && password
        ? {
            credential: {
              create: {
                username: encrypt(username),
                password: encrypt(password),
                loginUrl: loginUrl || null,
                loginConfig: loginConfig || null,
              },
            },
          }
        : {}),
    },
    include: { credential: { select: { id: true } } },
  });

  return NextResponse.json(platform, { status: 201 });
}
