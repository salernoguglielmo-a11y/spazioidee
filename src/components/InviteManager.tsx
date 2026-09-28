"use client";

import { useState } from "react";
import type { Invite } from "@/lib/auth/invites";
import type { AllowlistEntry } from "@/lib/auth/allowlist";

export default function InviteManager({
  initialInvites,
  allowlist,
}: {
  initialInvites: Invite[];
  allowlist: AllowlistEntry[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState(allowlist[0]?.email ?? "");
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFresh(null);
    setCopied(false);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, label }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Generazione non riuscita.");
      return;
    }
    setFresh(data.url);
    setInvites(data.invites);
    setLabel("");
  }

  async function revoke(id: string) {
    if (!confirm("Revocare questo link? Chi lo possiede non potrà più entrare con quello.")) return;
    const res = await fetch(`/api/admin/invites?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setInvites(data.invites);
  }

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Link di accesso diretto</h2>
        <p className="muted mt-1 text-sm">
          Serve quando non c&apos;è un servizio email configurato: il link apre la sessione senza
          passare dalla posta. Va trattato come una chiave di casa — chi ce l&apos;ha entra — ma è
          nominale, revocabile e sottoposto all&apos;allowlist: se togli l&apos;indirizzo, il link
          muore con lui.
        </p>
      </div>

      <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="invite-email">
            Per quale indirizzo
          </label>
          <select
            id="invite-email"
            className="select"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          >
            {allowlist.map((entry) => (
              <option key={entry.email} value={entry.email}>
                {entry.email}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="invite-label">
            Nota (facoltativa)
          </label>
          <input
            id="invite-label"
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Es. portatile, telefono"
          />
        </div>
        <button className="btn btn-primary" disabled={busy || !email}>
          {busy ? "…" : "Genera link"}
        </button>
      </form>

      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      {fresh ? (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--ok)" }}>
          <p className="text-sm font-semibold">Copialo adesso: non verrà più mostrato.</p>
          <textarea className="textarea mt-2 font-mono text-xs" rows={3} readOnly value={fresh} />
          <button
            className="btn mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fresh);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copiato" : "Copia link"}
          </button>
        </div>
      ) : null}

      {invites.length ? (
        <div className="divide-y">
          {invites.map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-56 flex-1">
                <p className="font-medium">
                  {invite.email}
                  {invite.label ? <span className="muted"> · {invite.label}</span> : null}
                </p>
                <p className="muted text-xs">
                  creato il {new Date(invite.created_at).toLocaleDateString("it-IT")} ·{" "}
                  {invite.uses === 0
                    ? "mai usato"
                    : `${invite.uses} accessi, ultimo ${new Date(
                        invite.last_used ?? invite.created_at,
                      ).toLocaleString("it-IT")}`}
                </p>
              </div>
              {invite.revoked ? (
                <span className="badge" style={{ color: "var(--muted)" }}>
                  revocato
                </span>
              ) : (
                <button className="btn" onClick={() => revoke(invite.id)}>
                  Revoca
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted text-sm">Nessun link generato.</p>
      )}
    </div>
  );
}
