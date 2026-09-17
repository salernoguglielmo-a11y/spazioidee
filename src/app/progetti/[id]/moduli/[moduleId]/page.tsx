import Link from "next/link";
import { notFound } from "next/navigation";
import ModuleWorkbench from "@/components/ModuleWorkbench";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { getAnalysis, listQuestions } from "@/lib/data/analyses";
import { getModule } from "@/lib/analysis/modules";
import { apiEnabled, manualEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  const module = getModule(moduleId);
  if (!project || !module) notFound();

  const [analysis, questions] = await Promise.all([getAnalysis(id, moduleId), listQuestions(id)]);
  const moduleQuestions = questions
    .filter((q) => q.module_id === moduleId && q.status === "aperta")
    .map((q) => ({ ...q, moduleName: module.name }));
  const answeredCount = questions.filter((q) => q.status === "risposta").length;

  return (
    <div className="space-y-5">
      <Link href={`/progetti/${id}/moduli`} className="muted text-xs hover:underline">
        ← Tutti i moduli
      </Link>

      <ModuleWorkbench
        projectId={id}
        module={{
          id: module.id,
          name: module.name,
          icon: module.icon,
          short: module.short,
          objective: module.objective,
          web: module.web,
        }}
        analysis={analysis}
        questions={moduleQuestions}
        answeredCount={answeredCount}
        apiEnabled={apiEnabled()}
        manualEnabled={manualEnabled()}
      />

      <details className="panel p-5">
        <summary className="cursor-pointer font-semibold">
          Griglia di best practice usata da questo modulo
        </summary>
        <pre className="muted mt-3 whitespace-pre-wrap text-xs">{module.framework}</pre>
      </details>
    </div>
  );
}
