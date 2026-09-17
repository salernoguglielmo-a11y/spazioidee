"use client";

import { useState } from "react";
import type { AllowlistEntry } from "@/lib/auth/allowlist";

export default function AllowlistManager({
  initialEntries,
  envManaged,
  currentEmail,
}: {
  initialEntries: AllowlistEntry[];
  envManaged: string[];
  currentEmail: string;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, note }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Operazione non riuscita.");
      return;
    }
    setEntries(data.entries);
    setEmail("");
    setNote("");
  }

  async function remove(target: string) {
    if (!confirm(`Revocare l'accesso a ${target}? La sessione in corso smette di funzionare al prossimo accesso.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/allowlist?email=${encodeURIComponent(target)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Rimozione non riuscita.");
      return;
    }
    setEntries(data.entries);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="panel flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="email">
            Indirizzo email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@dominio.it"
          />
        </div>
        <div className="w-40">
          <label className="label" htmlFor="role">
            Ruolo
          </label>
          <select
            id="role"
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "admin")}
          >
            <option value="member">Collaboratore</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="note">
            Nota (facoltativa)
          </label>
          <input
            id="note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es. commercialista"
          />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "…" : "Autorizza"}
        </button>
      </form>

      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      <div className="panel divide-y">
        {entries.map((entry) => {
          const locked = envManaged.includes(entry.email);
          return (
            <div key={entry.email} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-56 flex-1">
                <p className="font-medium">{entry.email}</p>
                <p className="muted text-xs">
                  {entry.note ? `${entry.note} · ` : ""}
                  aggiunto da {entry.added_by ?? "—"} il{" "}
                  {new Date(entry.created_at).toLocaleDateString("it-IT")}
                </p>
              </div>
              <span className="badge">
                {entry.role === "admin" ? "amministratore" : "collaboratore"}
              </span>
              {locked ? (
                <span className="badge" title="Definito nelle variabili d'ambiente">
                  da configurazione
                </span>
              ) : entry.email === currentEmail ? (
                <span className="badge">tu</span>
              ) : (
                <button className="btn" onClick={() => remove(entry.email)}>
                  Revoca
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
