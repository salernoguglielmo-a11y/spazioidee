import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/projects";
import { listAnalyses, listQuestions } from "@/lib/data/analyses";
import { listDocuments } from "@/lib/data/documents";
import { computeReadiness } from "@/lib/analysis/scoring";
import { ScoreBadge } from "@/components/Score";
import { missingConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const projects = await listProjects(user);

  const cards = await Promise.all(
    projects.map(async (project) => {
      const [analyses, questions, documents] = await Promise.all([
        listAnalyses(project.id),
        listQuestions(project.id),
        listDocuments(project.id),
      ]);
      return {
        project,
        readiness: computeReadiness(project.modules, analyses, questions),
        documents: documents.length,
      };
    }),
  );

  const missing = user.role === "admin" ? missingConfig() : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">I tuoi progetti</h1>
          <p className="muted mt-1 text-sm">
            Carica la documentazione, lascia che l&apos;analisi parta dai framework di settore, poi
            discutine e valida tu le conclusioni.
          </p>
        </div>
        <Link href="/progetti/nuovo" className="btn btn-primary">
          + Nuovo progetto
        </Link>
      </div>

      {missing.length ? (
        <div className="panel p-4 text-sm" style={{ borderColor: "var(--warn)" }}>
          <p className="font-semibold" style={{ color: "var(--warn)" }}>
            Configurazione incompleta
          </p>
          <p className="muted mt-1">
            Mancano: {missing.join(", ")}. Finché non sono impostate, alcune funzioni (analisi,
            invio email) non funzionano.
          </p>
        </div>
      ) : null}

      {cards.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-lg font-semibold">Nessun progetto ancora</p>
          <p className="muted mx-auto mt-2 max-w-md text-sm">
            Un progetto è uno spazio che raccoglie i documenti di un&apos;idea, le analisi per
            modulo, il dialogo e il dossier finale.
          </p>
          <Link href="/progetti/nuovo" className="btn btn-primary mt-5">
            Crea il primo progetto
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(({ project, readiness, documents }) => (
            <Link key={project.id} href={`/progetti/${project.id}`} className="panel block p-5 transition hover:opacity-90">
              <div className="flex items-start gap-4">
                <ScoreBadge score={readiness.score} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold">{project.name}</h2>
                  {project.one_liner ? (
                    <p className="muted mt-0.5 line-clamp-2 text-sm">{project.one_liner}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.stage ? <span className="badge">{project.stage}</span> : null}
                    {project.sector ? <span className="badge">{project.sector}</span> : null}
                    <span className="badge">{documents} documenti</span>
                    <span className="badge">
                      {readiness.analyzed}/{readiness.total} moduli
                    </span>
                    {readiness.openQuestions > 0 ? (
                      <span className="badge" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>
                        {readiness.openQuestions} domande aperte
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
