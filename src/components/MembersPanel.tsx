"use client";

import { useState } from "react";
import type { Member } from "@/lib/data/members";

type Props = {
  projectId: string;
  ownerEmail: string;
  initialMembers: Member[];
  /** Indirizzi autorizzati allo spazio, fra cui scegliere. */
  candidates: string[];
  canManage: boolean;
};

export default function MembersPanel({
  projectId,
  ownerEmail,
  initialMembers,
  candidates,
  canManage,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectable = candidates.filter(
    (c) => c !== ownerEmail && !members.some((m) => m.email === c),
  );

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Operazione non riuscita.");
      return;
    }
    setMembers(data.members);
    setEmail("");
  }

  async function remove(target: string) {
    if (!confirm(`Togliere l'accesso a ${target}? Non vedrà più documenti, analisi e dialogo.`)) return;
    const res = await fetch(`/api/projects/${projectId}/members?email=${encodeURIComponent(target)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Rimozione non riuscita.");
      return;
    }
    setMembers(data.members);
  }

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Chi vede questo progetto</h2>
        <p className="muted mt-1 text-sm">
          Gli altri utenti dello spazio vedono il nome del progetto nell&apos;elenco, ma non
          documenti, analisi, dialogo o dossier. Qui decidi chi entra nel merito.
        </p>
      </div>

      <ul className="space-y-2">
        <li className="flex flex-wrap items-center gap-3 rounded-xl border p-3" style={{ background: "var(--panel-2)" }}>
          <span className="flex-1 font-medium">{ownerEmail}</span>
          <span className="badge">ha creato il progetto</span>
        </li>
        {members
          .filter((m) => m.email !== ownerEmail)
          .map((member) => (
            <li key={member.email} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
              <span className="min-w-48 flex-1">
                {member.email}
                <span className="muted block text-xs">
                  aggiunto da {member.added_by ?? "—"} il{" "}
                  {new Date(member.created_at).toLocaleDateString("it-IT")}
                </span>
              </span>
              {canManage ? (
                <button className="btn" onClick={() => remove(member.email)}>
                  Togli accesso
                </button>
              ) : null}
            </li>
          ))}
      </ul>

      {canManage ? (
        selectable.length ? (
          <form onSubmit={add} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label className="label" htmlFor="member-email">
                Aggiungi una persona autorizzata
              </label>
              <select
                id="member-email"
                className="select"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              >
                <option value="">Scegli un indirizzo…</option>
                {selectable.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" disabled={busy || !email}>
              {busy ? "…" : "Dai accesso"}
            </button>
          </form>
        ) : (
          <p className="muted text-sm">
            Tutte le persone autorizzate allo spazio hanno già accesso a questo progetto. Per
            aggiungerne altre, inseriscile prima in <strong>Accessi</strong>.
          </p>
        )
      ) : (
        <p className="muted text-sm">
          Solo chi ha creato il progetto, o un amministratore, può modificare questo elenco.
        </p>
      )}

      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
