import { notFound } from "next/navigation";
import ProjectSettingsForm from "@/components/ProjectSettingsForm";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Impostazioni del progetto</h2>
        <p className="muted mt-1 text-sm">
          La scheda progetto viene inclusa in ogni prompt: più è precisa, più l&apos;analisi è
          calibrata.
        </p>
      </div>
      <ProjectSettingsForm project={project} />
      <p className="muted text-xs">
        Creato da {project.owner_email} il {new Date(project.created_at).toLocaleDateString("it-IT")}.
      </p>
    </div>
  );
}
