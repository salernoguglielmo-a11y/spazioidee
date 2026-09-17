import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { buildProjectContext } from "@/lib/analysis/context";

export const runtime = "nodejs";

/** Trasparenza: mostra esattamente cosa viene inviato al modello. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { project } = await requireProject(id);
    const context = await buildProjectContext(project);

    const textBlock = context.blocks.find((b) => b.type === "text");
    const preview = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return NextResponse.json({
      stats: context.stats,
      warnings: context.warnings,
      blocks: context.blocks.map((b) =>
        b.type === "document" ? { type: "pdf-nativo" } : { type: "testo", chars: preview.length },
      ),
      preview: preview.slice(0, 4000),
      previewTruncated: preview.length > 4000,
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
