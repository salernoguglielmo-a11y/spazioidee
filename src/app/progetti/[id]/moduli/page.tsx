import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { listAnalyses } from "@/lib/data/analyses";
import { modulesFor } from "@/lib/analysis/modules";
import { ScoreBadge, StatusBadge } from "@/components/Score";

export const dynamic = "force-dynamic";

export default async function ModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  const analyses = await listAnalyses(id);
  const byModule = new Map(analyses.map((a) => [a.module_id, a]));
  const modules = modulesFor(project.modules);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Moduli di analisi</h2>
          <p className="muted mt-1 text-sm">
            Ogni modulo applica una griglia di best practice diversa. Puoi eseguirli nell&apos;ordine
            che preferisci: ogni analisi validata entra nel contesto delle successive.
          </p>
        </div>
        <Link href={`/progetti/${id}/impostazioni`} className="btn">
          Attiva o disattiva moduli
        </Link>
      </div>

      <div className="space-y-3">
        {modules.map((module) => {
          const analysis = byModule.get(module.id);
          return (
            <Link
              key={module.id}
              href={`/progetti/${id}/moduli/${module.id}`}
              className="panel flex flex-wrap items-center gap-4 p-4 transition hover:opacity-90"
            >
              <ScoreBadge score={analysis?.score ?? null} />
              <div className="min-w-64 flex-1">
                <p className="font-semibold">
                  <span aria-hidden>{module.icon}</span> {module.name}
                </p>
                <p className="muted mt-0.5 text-sm">{analysis?.summary ?? module.short}</p>
              </div>
              <div className="flex items-center gap-2">
                {module.web ? <span className="badge">web</span> : null}
                <StatusBadge status={analysis?.status ?? "assente"} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
