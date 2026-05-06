import PlatformForm from "@/components/admin/platform-form";

export default function NewPlatformPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nova Plataforma</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          Adicione uma nova ferramenta com login automático
        </p>
      </div>
      <PlatformForm />
    </div>
  );
}
