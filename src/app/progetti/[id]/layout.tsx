import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectTabs from "@/components/ProjectTabs";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="muted text-xs hover:underline">
            ← Tutti i progetti
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.one_liner ? <p className="muted text-sm">{project.one_liner}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {project.stage ? <span className="badge">{project.stage}</span> : null}
          {project.sector ? <span className="badge">{project.sector}</span> : null}
          {project.geography ? <span className="badge">{project.geography}</span> : null}
        </div>
      </div>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
