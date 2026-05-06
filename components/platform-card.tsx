"use client";

import Link from "next/link";
import Image from "next/image";

interface PlatformCardProps {
  id: string;
  name: string;
  url: string;
  iconUrl?: string | null;
  description?: string | null;
  hasCredentials: boolean;
}

export default function PlatformCard({
  id,
  name,
  url,
  iconUrl,
  description,
  hasCredentials,
}: PlatformCardProps) {
  const hostname = new URL(url).hostname.replace("www.", "");
  const faviconUrl = iconUrl || `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3 transition-all hover:border-indigo-500/50 group"
      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center shrink-0">
          <Image
            src={faviconUrl}
            alt={name}
            width={32}
            height={32}
            className="object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{name}</h3>
          <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
            {hostname}
          </p>
        </div>
      </div>

      {description && (
        <p className="text-sm line-clamp-2" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      )}

      <div className="mt-auto flex gap-2">
        <Link
          href={`/view/${id}`}
          className="flex-1 text-center py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "var(--primary)" }}
        >
          {hasCredentials ? "Abrir" : "Abrir (sem login)"}
        </Link>
      </div>
    </div>
  );
}
