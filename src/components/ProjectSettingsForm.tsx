"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MODULES } from "@/lib/analysis/modules";
import { STAGES, type Project } from "@/lib/data/types";

export default function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: project.name,
    one_liner: project.one_liner ?? "",
    sector: project.sector ?? "",
    stage: project.stage ?? "Idea",
    geography: project.geography ?? "",
    business_model: project.business_model ?? "",
    goal: project.goal ?? "",
  });
  const [modules, setModules] = useState<string[]>(project.modules);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, modules }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Salvataggio non riuscito.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Eliminare "${project.name}" con documenti, analisi e dialogo? L'operazione è definitiva.`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Eliminazione non riuscita.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="space-y-5">
      <div className="panel space-y-4 p-5">
        <h2 className="font-semibold">Scheda progetto</h2>
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input id="name" className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="one_liner">
            In una riga
          </label>
          <input
            id="one_liner"
            className="input"
            value={form.one_liner}
            onChange={(e) => update("one_liner", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sector">
              Settore
            </label>
            <input id="sector" className="input" value={form.sector} onChange={(e) => update("sector", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="stage">
              Fase
            </label>
            <select id="stage" className="select" value={form.stage} onChange={(e) => update("stage", e.target.value)}>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="geography">
              Mercato geografico
            </label>
            <input
              id="geography"
              className="input"
              value={form.geography}
              onChange={(e) => update("geography", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="business_model">
              Modello di business
            </label>
            <input
              id="business_model"
              className="input"
              value={form.business_model}
              onChange={(e) => update("business_model", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="goal">
            Obiettivo dell&apos;analisi
          </label>
          <textarea
            id="goal"
            className="textarea"
            rows={3}
            value={form.goal}
            onChange={(e) => update("goal", e.target.value)}
          />
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold">Moduli attivi</h2>
        <p className="muted mt-1 text-sm">
          Disattivare un modulo lo toglie da dossier e punteggio: l&apos;analisi già prodotta resta
          salvata e ricompare se lo riattivi.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {MODULES.map((module) => {
            const active = modules.includes(module.id);
            return (
              <button
                type="button"
                key={module.id}
                onClick={() => {
                  setModules((prev) =>
                    prev.includes(module.id) ? prev.filter((m) => m !== module.id) : [...prev, module.id],
                  );
                  setSaved(false);
                }}
                className="flex items-start gap-3 rounded-xl border p-3 text-left"
                style={{
                  background: active ? "var(--accent-soft)" : "var(--panel)",
                  borderColor: active ? "var(--muted)" : "var(--border)",
                }}
              >
                <span aria-hidden className="text-lg">
                  {module.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{module.name}</span>
                  <span className="muted block text-xs">{module.short}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva modifiche"}
        </button>
        {saved ? <span className="muted text-sm">Salvato.</span> : null}
        <button className="btn" style={{ color: "var(--bad)" }} onClick={remove}>
          Elimina progetto
        </button>
      </div>
    </div>
  );
}
