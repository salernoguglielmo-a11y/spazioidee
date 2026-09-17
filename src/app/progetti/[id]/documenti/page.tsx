import { notFound } from "next/navigation";
import DocumentsPanel from "@/components/DocumentsPanel";
import ContextInspector from "@/components/ContextInspector";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { listDocuments } from "@/lib/data/documents";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  const documents = await listDocuments(id);
  const light = documents.map((d) => ({ ...d, preview: d.content.slice(0, 220), content: "" }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Documenti del progetto</h2>
        <p className="muted mt-1 text-sm">
          Business plan, pitch deck, piano finanziario, ricerche, contratti: tutto ciò che carichi
          diventa contesto per ogni modulo di analisi e per il dialogo.
        </p>
      </div>
      <DocumentsPanel projectId={id} documents={light} maxMb={env.maxUploadMb} />
      <ContextInspector projectId={id} />
    </div>
  );
}
