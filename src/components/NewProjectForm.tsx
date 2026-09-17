"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MODULES, defaultModuleIds } from "@/lib/analysis/modules";
import { STAGES } from "@/lib/data/types";

export default function NewProjectForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>(defaultModuleIds());
  const [form, setForm] = useState({
    name: "",
    one_liner: "",
    sector: "",
    stage: "Idea",
    geography: "",
    business_model: "",
    goal: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleModule(id: string) {
    setModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, modules }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Creazione non riuscita.");
      setSaving(false);
      return;
    }
    router.push(`/progetti/${data.project.id}/documenti`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="panel space-y-4 p-5">
        <div>
          <label className="label" htmlFor="name">
            Nome del progetto *
          </label>
          <input
            id="name"
            className="input"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Es. Piattaforma per studi dentistici"
          />
        </div>
        <div>
          <label className="label" htmlFor="one_liner">
            Il progetto in una riga
          </label>
          <input
            id="one_liner"
            className="input"
            value={form.one_liner}
            onChange={(e) => update("one_liner", e.target.value)}
            placeholder="Cosa fate, per chi, con quale beneficio"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sector">
              Settore
            </label>
            <input
              id="sector"
              className="input"
              value={form.sector}
              onChange={(e) => update("sector", e.target.value)}
              placeholder="Es. Healthtech B2B"
            />
          </div>
          <div>
            <label className="label" htmlFor="stage">
              Fase
            </label>
            <select
              id="stage"
              className="select"
              value={form.stage}
              onChange={(e) => update("stage", e.target.value)}
            >
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
              placeholder="Es. Italia, poi UE"
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
              placeholder="Es. abbonamento SaaS"
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
            placeholder="Es. capire se il piano regge prima di cercare un investitore seed, o decidere se procedere"
          />
        </div>
      </div>

      <div className="panel p-5">
        <p className="font-semibold">Moduli di analisi</p>
        <p className="muted mt-1 text-sm">
          Attiva solo quelli utili a questo progetto: puoi cambiarli in qualsiasi momento.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {MODULES.map((module) => {
            const active = modules.includes(module.id);
            return (
              <button
                type="button"
                key={module.id}
                onClick={() => toggleModule(module.id)}
                className="flex items-start gap-3 rounded-xl border p-3 text-left transition"
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

      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Creazione…" : "Crea progetto"}
        </button>
        <button type="button" className="btn" onClick={() => history.back()}>
          Annulla
        </button>
      </div>
    </form>
  );
}
