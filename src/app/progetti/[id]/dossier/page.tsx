import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { buildDossier } from "@/lib/analysis/dossier";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  const dossier = await buildDossier(project);

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Dossier consolidato</h2>
          <p className="muted mt-1 text-sm">
            Tutte le analisi in un unico documento. Dove hai validato una versione, è la tua a
            comparire: l&apos;output finale è tuo, non del modello.
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={`/api/projects/${id}/export`}>
            Scarica .md
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="panel p-8">
        <Markdown>{dossier}</Markdown>
      </div>
    </div>
  );
}
