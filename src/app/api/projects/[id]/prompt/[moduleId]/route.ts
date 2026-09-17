import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { buildProjectContext } from "@/lib/analysis/context";
import { buildManualPrompt } from "@/lib/analysis/manual";
import { getModule } from "@/lib/analysis/modules";
import { getAnalysis } from "@/lib/data/analyses";

export const runtime = "nodejs";

/** Prompt pronto da incollare su claude.ai: modalità senza chiave API. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string; moduleId: string }> }) {
  try {
    const { id, moduleId } = await ctx.params;
    const { project } = await requireProject(id);
    const module = getModule(moduleId);
    if (!module) return notFoundResponse();

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "istruzioni" ? "istruzioni" : "completo";
    const focus = url.searchParams.get("focus") ?? undefined;

    const context = await buildProjectContext(project);
    const existing = await getAnalysis(id, moduleId);

    const prompt = buildManualPrompt(
      module,
      mode === "completo"
        ? context.text
        : context.text.replace(/<documento[\s\S]*?<\/documento>/g, (match) => {
            const filename = /file="([^"]+)"/.exec(match)?.[1] ?? "documento";
            return `<documento file="${filename}">[allegato al messaggio]</documento>`;
          }),
      mode,
      { focus: focus?.trim() || undefined, isRerun: Boolean(existing) },
    );

    return NextResponse.json({
      prompt,
      chars: prompt.length,
      warnings: context.warnings,
      documents: context.stats.documents,
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
