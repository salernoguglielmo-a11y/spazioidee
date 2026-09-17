import Link from "next/link";
import AllowlistManager from "@/components/AllowlistManager";
import { requirePageUser } from "@/lib/auth/session";
import { listAllowlist } from "@/lib/auth/allowlist";
import { env, missingConfig } from "@/lib/env";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requirePageUser();
  if (admin.role !== "admin") {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold">Area riservata</h1>
        <p className="muted mt-2 text-sm">
          La gestione degli accessi è riservata agli amministratori. Chiedi a chi amministra lo
          spazio di assegnarti il ruolo, se ti serve.
        </p>
      </div>
    );
  }
  const entries = await listAllowlist();
  const envManaged = [...env.allowedEmails, ...env.adminEmails];
  const missing = missingConfig();

  const recent = await queryAll<{
    actor: string | null;
    action: string;
    target: string | null;
    detail: string | null;
    created_at: string;
  }>("SELECT actor, action, target, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT 25");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accessi</h1>
          <p className="muted mt-1 text-sm">
            Solo gli indirizzi presenti in questo elenco possono entrare. Non esiste registrazione
            libera: l&apos;accesso avviene con un link monouso inviato all&apos;indirizzo
            autorizzato.
          </p>
        </div>
        <Link href="/stato" className="btn">
          Stato del sistema
        </Link>
      </div>

      {missing.length ? (
        <div className="panel p-4 text-sm" style={{ borderColor: "var(--warn)" }}>
          <p className="font-semibold" style={{ color: "var(--warn)" }}>
            Configurazione incompleta
          </p>
          <p className="muted mt-1">Variabili mancanti: {missing.join(", ")}.</p>
        </div>
      ) : null}

      <AllowlistManager initialEntries={entries} envManaged={envManaged} currentEmail={admin.email} />

      <div className="panel p-5">
        <h2 className="font-semibold">Attività recente</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="muted text-left text-xs uppercase">
              <th className="py-1">Quando</th>
              <th>Chi</th>
              <th>Azione</th>
              <th>Oggetto</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="py-1.5">{new Date(row.created_at).toLocaleString("it-IT")}</td>
                <td>{row.actor ?? "—"}</td>
                <td>{row.action}</td>
                <td className="muted">{row.detail ?? row.target ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
