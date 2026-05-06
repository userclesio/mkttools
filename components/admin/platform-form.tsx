"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PlatformFormProps {
  initialData?: {
    id: string;
    name: string;
    url: string;
    iconUrl?: string | null;
    description?: string | null;
    isActive: boolean;
    credential?: {
      loginUrl?: string | null;
      loginConfig?: string | null;
    } | null;
  };
}

const LOGIN_PRESETS: Record<string, { loginUrl: string; loginConfig: string }> = {
  canva: {
    loginUrl: "https://www.canva.com/login",
    loginConfig: JSON.stringify({
      emailSelector: 'input[name="email"]',
      passwordSelector: 'input[name="password"]',
      submitSelector: 'button[type="submit"]',
    }),
  },
  google: {
    loginUrl: "https://accounts.google.com",
    loginConfig: JSON.stringify({
      emailSelector: 'input[type="email"]',
      passwordSelector: 'input[type="password"]',
      submitSelector: "#passwordNext button",
    }),
  },
};

export default function PlatformForm({ initialData }: PlatformFormProps) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    name: initialData?.name || "",
    url: initialData?.url || "",
    iconUrl: initialData?.iconUrl || "",
    description: initialData?.description || "",
    isActive: initialData?.isActive ?? true,
    username: "",
    password: "",
    loginUrl: initialData?.credential?.loginUrl || "",
    loginConfig: initialData?.credential?.loginConfig || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyPreset(key: string) {
    const preset = LOGIN_PRESETS[key];
    if (preset) {
      set("loginUrl", preset.loginUrl);
      set("loginConfig", preset.loginConfig);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = isEdit ? `/api/platforms/${initialData!.id}` : "/api/platforms";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/admin/platforms");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao salvar");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <section
        className="rounded-xl border p-5 space-y-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <h2 className="font-semibold text-white">Informações da Plataforma</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Canva, Google Ads..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              required
              placeholder="https://canva.com"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">URL do Ícone (opcional)</label>
          <input
            value={form.iconUrl}
            onChange={(e) => set("iconUrl", e.target.value)}
            placeholder="https://exemplo.com/icon.png"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Descrição (opcional)</label>
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Breve descrição da plataforma"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Plataforma ativa (visível para usuários)</span>
          </label>
        )}
      </section>

      <section
        className="rounded-xl border p-5 space-y-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Credenciais de Login</h2>
          <div className="flex gap-2">
            <span className="text-xs text-gray-500">Preset:</span>
            {Object.keys(LOGIN_PRESETS).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors capitalize"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Usuário / Email{isEdit ? "" : " *"}
            </label>
            <input
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              required={!isEdit}
              placeholder="email@exemplo.com"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Senha{isEdit ? "" : " *"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required={!isEdit}
              placeholder={isEdit ? "Nova senha (deixe vazio para manter)" : "••••••••"}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">URL de Login (opcional)</label>
          <input
            value={form.loginUrl}
            onChange={(e) => set("loginUrl", e.target.value)}
            placeholder="https://plataforma.com/login (se diferente da URL principal)"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Configuração de Login (JSON com seletores CSS)
          </label>
          <textarea
            value={form.loginConfig}
            onChange={(e) => set("loginConfig", e.target.value)}
            rows={4}
            placeholder={`{\n  "emailSelector": "input[name='email']",\n  "passwordSelector": "input[name='password']",\n  "submitSelector": "button[type='submit']"\n}`}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use os presets acima para preencher automaticamente para plataformas conhecidas.
          </p>
        </div>
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--primary)" }}
        >
          {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Plataforma"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/platforms")}
          className="px-6 py-2 rounded-lg text-sm font-medium border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
