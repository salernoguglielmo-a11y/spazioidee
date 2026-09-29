import { notFound } from "next/navigation";
import MembersPanel from "@/components/MembersPanel";
import ProjectSettingsForm from "@/components/ProjectSettingsForm";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { listMembers } from "@/lib/data/members";
import { listAllowlist } from "@/lib/auth/allowlist";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  const [members, allowlist] = await Promise.all([listMembers(id), listAllowlist()]);
  const canManage = user.role === "admin" || project.owner_email === user.email;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Impostazioni del progetto</h2>
        <p className="muted mt-1 text-sm">
          La scheda progetto viene inclusa in ogni prompt: più è precisa, più l&apos;analisi è
          calibrata.
        </p>
      </div>
      <ProjectSettingsForm project={project} canManage={canManage} />

      {env.projectVisibility === "shared" ? (
        <div className="panel p-5 text-sm">
          <p className="font-semibold">Progetti condivisi</p>
          <p className="muted mt-1">
            Lo spazio è configurato in modalità condivisa: ogni persona autorizzata vede tutti i
            progetti per intero. Per separarli, imposta PROJECT_VISIBILITY su «membri».
          </p>
        </div>
      ) : (
        <MembersPanel
          projectId={project.id}
          ownerEmail={project.owner_email}
          initialMembers={members}
          candidates={allowlist.map((a) => a.email)}
          canManage={canManage}
        />
      )}
      <p className="muted text-xs">
        Creato da {project.owner_email} il {new Date(project.created_at).toLocaleDateString("it-IT")}.
        Archiviare un progetto lo toglie dall&apos;elenco e dal confronto senza cancellare nulla:
        resta visibile attivando «Mostra archiviati».
      </p>
    </div>
  );
}
