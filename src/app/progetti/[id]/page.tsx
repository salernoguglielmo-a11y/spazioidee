import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { listAnalyses, listInsights, listQuestions } from "@/lib/data/analyses";
import { listDocuments } from "@/lib/data/documents";
import { modulesFor, getModule } from "@/lib/analysis/modules";
import { computeReadiness } from "@/lib/analysis/scoring";
import { ScoreBadge, StatusBadge } from "@/components/Score";
import QuestionsPanel from "@/components/QuestionsPanel";
import NotesPanel from "@/components/NotesPanel";

export const dynamic = "force-dynamic";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  const [analyses, questions, insights, documents] = await Promise.all([
    listAnalyses(id),
    listQuestions(id),
    listInsights(id),
    listDocuments(id),
  ]);

  const readiness = computeReadiness(project.modules, analyses, questions);
  const modules = modulesFor(project.modules);
  const byModule = new Map(analyses.map((a) => [a.module_id, a]));
  const openQuestions = questions
    .filter((q) => q.status === "aperta")
    .map((q) => ({ ...q, moduleName: getModule(q.module_id)?.name ?? q.module_id }));

  const topRisks = analyses
    .flatMap((a) => a.risks.map((risk) => ({ risk, module: getModule(a.module_id)?.name ?? a.module_id, score: a.score ?? 100 })))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const nextActions = analyses
    .flatMap((a) => a.actions.map((action) => ({ action, module: getModule(a.module_id)?.name ?? a.module_id, score: a.score ?? 100 })))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center gap-6 p-6">
        <ScoreBadge score={readiness.score} size="lg" />
        <div className="min-w-64 flex-1">
          <p className="text-lg font-semibold">{readiness.label}</p>
          <p className="muted mt-1 text-sm">{readiness.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge">{documents.length} documenti</span>
            <span className="badge">
              {readiness.analyzed}/{readiness.total} moduli analizzati
            </span>
            <span className="badge">{readiness.validated} validati da te</span>
            <span className="badge">{readiness.openQuestions} domande aperte</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/progetti/${id}/documenti`} className="btn">
            Carica documenti
          </Link>
          <Link href={`/progetti/${id}/moduli`} className="btn btn-primary">
            Avvia un&apos;analisi
          </Link>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="panel p-5 text-sm" style={{ borderColor: "var(--warn)" }}>
          <p className="font-semibold">Nessun documento caricato</p>
          <p className="muted mt-1">
            Puoi comunque avviare l&apos;analisi partendo dalla scheda progetto, ma il valore vero
            arriva quando Claude legge il business plan, il deck o il piano finanziario.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {modules.map((module) => {
          const analysis = byModule.get(module.id);
          return (
            <Link
              key={module.id}
              href={`/progetti/${id}/moduli/${module.id}`}
              className="panel flex flex-col gap-3 p-4 transition hover:opacity-90"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-xl">
                    {module.icon}
                  </span>
                  <span className="font-semibold">{module.name}</span>
                </div>
                <ScoreBadge score={analysis?.score ?? null} size="sm" />
              </div>
              <p className="muted text-xs">{analysis?.summary ?? module.short}</p>
              <StatusBadge status={analysis?.status ?? "assente"} />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-semibold">Criticità principali</h2>
          {topRisks.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {topRisks.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden style={{ color: "var(--bad)" }}>
                    ▪
                  </span>
                  <span>
                    {item.risk} <span className="muted text-xs">({item.module})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-2 text-sm">Compaiono dopo la prima analisi.</p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="font-semibold">Prossime azioni consigliate</h2>
          {nextActions.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {nextActions.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden style={{ color: "var(--good)" }}>
                    →
                  </span>
                  <span>
                    {item.action} <span className="muted text-xs">({item.module})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-2 text-sm">Compaiono dopo la prima analisi.</p>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold">Domande aperte per te</h2>
        <p className="muted mt-1 mb-4 text-sm">
          Qui l&apos;analisi si ferma e aspetta te: ogni risposta viene riusata nei moduli
          successivi e nel dialogo.
        </p>
        <QuestionsPanel projectId={id} questions={openQuestions} />
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold">Note e informazioni aggiuntive</h2>
        <div className="mt-3">
          <NotesPanel projectId={id} insights={insights} />
        </div>
      </div>
    </div>
  );
}
