import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { getModule } from "@/lib/analysis/modules";
import { runModule } from "@/lib/analysis/runner";
import { getAnalysis } from "@/lib/data/analyses";
import { sseResponse } from "@/lib/sse";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; moduleId: string }> },
) {
  try {
    const { id, moduleId } = await ctx.params;
    const { user, project } = await requireProject(id);
    const module = getModule(moduleId);
    if (!module) return notFoundResponse();

    const body = await request.json().catch(() => ({}));
    const focus = typeof body.focus === "string" && body.focus.trim() ? body.focus.trim() : undefined;
    const existing = await getAnalysis(id, moduleId);

    await audit(user.email, "analysis.run", `${id}/${moduleId}`, focus ?? null);

    return sseResponse(async (send) => {
      await runModule(project, module, { focus, isRerun: Boolean(existing) }, send);
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
