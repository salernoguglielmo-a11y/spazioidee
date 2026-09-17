import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { runDiagnostics } from "@/lib/diagnostics";

export const dynamic = "force-dynamic";

const COLORS: Record<string, string> = {
  ok: "var(--ok)",
  attenzione: "var(--warn)",
  errore: "var(--bad)",
};

const ICONS: Record<string, string> = { ok: "✓", attenzione: "!", errore: "✕" };

export default async function StatusPage() {
  const user = await requirePageUser();
  if (user.role !== "admin") {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold">Area riservata</h1>
        <p className="muted mt-2 text-sm">Lo stato del sistema è visibile agli amministratori.</p>
      </div>
    );
  }

  const checks = await runDiagnostics();
  const problems = checks.filter((c) => c.state !== "ok").length;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="muted text-xs hover:underline">
          ← Accessi
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Stato del sistema</h1>
        <p className="muted mt-1 text-sm">
          {problems === 0
            ? "Tutto a posto: l'applicazione è configurata correttamente."
            : `${problems} punti da sistemare. Ogni riga dice cosa fare.`}
        </p>
      </div>

      <div className="panel divide-y">
        {checks.map((check) => (
          <div key={check.name} className="flex items-start gap-3 p-4">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ color: COLORS[check.state], border: `2px solid ${COLORS[check.state]}` }}
              aria-hidden
            >
              {ICONS[check.state]}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{check.name}</p>
              <p className="muted mt-0.5 text-sm">{check.detail}</p>
              {check.hint ? (
                <p className="mt-1 text-xs" style={{ color: COLORS[check.state] }}>
                  {check.hint}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <p className="muted text-xs">
        Dopo ogni modifica alle variabili d&apos;ambiente serve un nuovo deploy perché abbia effetto.
      </p>
    </div>
  );
}
