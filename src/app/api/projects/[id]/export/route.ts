import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { buildDossier } from "@/lib/analysis/dossier";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { project } = await requireProject(id);
    const markdown = await buildDossier(project);
    const filename = `dossier-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
