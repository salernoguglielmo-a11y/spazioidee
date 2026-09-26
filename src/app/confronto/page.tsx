import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/projects";
import { listAnalyses, listQuestions } from "@/lib/data/analyses";
import { listDocuments } from "@/lib/data/documents";
import { MODULES, modulesFor } from "@/lib/analysis/modules";
import { computeReadiness } from "@/lib/analysis/scoring";
import { ScoreBadge } from "@/components/Score";

export const dynamic = "force-dynamic";

function cellColor(score: number | null): { background: string; color: string } {
  if (score === null) return { background: "var(--panel-2)", color: "var(--muted)" };
  if (score >= 85) return { background: "color-mix(in srgb, var(--ok) 18%, transparent)", color: "var(--ok)" };
  if (score >= 70) return { background: "color-mix(in srgb, var(--good) 18%, transparent)", color: "var(--good)" };
  if (score >= 50) return { background: "color-mix(in srgb, var(--warn) 18%, transparent)", color: "var(--warn)" };
  return { background: "color-mix(in srgb, var(--bad) 18%, transparent)", color: "var(--bad)" };
}

export default async function ComparePage() {
  const user = await requirePageUser();
  const projects = await listProjects(user);

  const rows = await Promise.all(
    projects.map(async (project) => {
      const [analyses, questions, documents] = await Promise.all([
        listAnalyses(project.id),
        listQuestions(project.id),
        listDocuments(project.id),
      ]);
      return {
        project,
        readiness: computeReadiness(project.modules, analyses, questions),
        scores: new Map(analyses.map((a) => [a.module_id, a.score ?? null])),
        statuses: new Map(analyses.map((a) => [a.module_id, a.status])),
        documents: documents.length,
        modules: modulesFor(project.modules).map((m) => m.id),
      };
    }),
  );

  // Le colonne sono i moduli effettivamente usati da almeno un progetto.
  const usedModuleIds = new Set(rows.flatMap((r) => r.modules));
  const columns = MODULES.filter((m) => usedModuleIds.has(m.id));

  const ranked = [...rows].sort(
    (a, b) => (b.readiness.score ?? -1) - (a.readiness.score ?? -1),
  );
  const scored = ranked.filter((r) => r.readiness.score !== null);

  // Media per modulo su tutti i progetti: dice dove il portafoglio è debole.
  const moduleAverages = columns
    .map((module) => {
      const values = rows
        .map((r) => r.scores.get(module.id))
        .filter((v): v is number => typeof v === "number");
      return {
        module,
        average: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
        count: values.length,
      };
    })
    .filter((m) => m.count > 0);

  const weakest = [...moduleAverages].sort((a, b) => (a.average ?? 100) - (b.average ?? 100)).slice(0, 3);
  const totalOpenQuestions = rows.reduce((sum, r) => sum + r.readiness.openQuestions, 0);

  if (projects.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-lg font-semibold">Nessun progetto da confrontare</p>
        <Link href="/progetti/nuovo" className="btn btn-primary mt-4">
          Crea il primo progetto
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Confronto fra le idee</h1>
        <p className="muted mt-1 text-sm">
          Gli stessi moduli applicati a progetti diversi diventano confrontabili: serve a decidere su
          cosa vale la pena investire tempo, non solo a sapere com&apos;è fatta una singola idea.
        </p>
      </div>

      {scored.length >= 2 ? (
        <div className="panel grid gap-5 p-5 sm:grid-cols-3">
          <div>
            <p className="label">Più avanti</p>
            <div className="flex items-center gap-3">
              <ScoreBadge score={scored[0]!.readiness.score} size="sm" />
              <div className="min-w-0">
                <Link href={`/progetti/${scored[0]!.project.id}`} className="block truncate font-semibold hover:underline">
                  {scored[0]!.project.name}
                </Link>
                <span className="muted text-xs">{scored[0]!.readiness.label}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="label">Moduli più deboli nel complesso</p>
            <ul className="space-y-1 text-sm">
              {weakest.map(({ module, average }) => (
                <li key={module.id}>
                  <span aria-hidden>{module.icon}</span> {module.name}{" "}
                  <span className="muted text-xs">media {average}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">Lavoro aperto</p>
            <p className="text-sm">
              {totalOpenQuestions} domande in attesa di risposta su {rows.length} progetti.
            </p>
            <p className="muted mt-1 text-xs">
              Le domande senza risposta sono il freno più comune: ogni risposta alza la qualità
              dell&apos;analisi successiva.
            </p>
          </div>
        </div>
      ) : null}

      <div className="panel overflow-x-auto p-1">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 p-3 text-left text-xs font-semibold uppercase"
                style={{ background: "var(--panel)", color: "var(--muted)" }}
              >
                Progetto
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                Indice
              </th>
              {columns.map((module) => (
                <th key={module.id} className="p-2 text-center" title={`${module.name} — ${module.short}`}>
                  <span aria-hidden className="text-base">
                    {module.icon}
                  </span>
                </th>
              ))}
              <th className="p-3 text-center text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                Domande
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ project, readiness, scores, statuses, documents, modules }) => (
              <tr key={project.id} className="border-t">
                <td className="sticky left-0 z-10 p-3" style={{ background: "var(--panel)" }}>
                  <Link href={`/progetti/${project.id}`} className="font-semibold hover:underline">
                    {project.name}
                  </Link>
                  <p className="muted text-xs">
                    {project.stage ?? "fase non indicata"} · {documents} documenti ·{" "}
                    {readiness.validated} validati
                  </p>
                </td>
                <td className="p-2 text-center font-bold" style={cellColor(readiness.score)}>
                  {readiness.score ?? "—"}
                </td>
                {columns.map((module) => {
                  const active = modules.includes(module.id);
                  const score = scores.get(module.id) ?? null;
                  if (!active) {
                    return (
                      <td key={module.id} className="p-2 text-center" title="Modulo non attivo su questo progetto">
                        <span className="muted text-xs">·</span>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={module.id}
                      className="p-2 text-center font-semibold"
                      style={cellColor(score)}
                      title={`${module.name}: ${score ?? "non analizzato"}${
                        statuses.get(module.id) === "validata" ? " (validata)" : ""
                      }`}
                    >
                      <Link href={`/progetti/${project.id}/moduli/${module.id}`}>
                        {score ?? "—"}
                        {statuses.get(module.id) === "validata" ? (
                          <span className="block text-[9px] leading-none">✓</span>
                        ) : null}
                      </Link>
                    </td>
                  );
                })}
                <td className="p-2 text-center">
                  {readiness.openQuestions > 0 ? (
                    <span className="badge" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>
                      {readiness.openQuestions}
                    </span>
                  ) : (
                    <span className="muted text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted text-xs">
        I punteggi sono confrontabili solo fra moduli analizzati con la stessa griglia: un modulo non
        ancora eseguito resta vuoto e non influenza l&apos;indice. Il segno ✓ indica le analisi che hai
        validato: quelle pesano di più nel calcolo.
      </p>
    </div>
  );
}
