import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { buildProjectContext } from "@/lib/analysis/context";
import { CHAT_SYSTEM_SUFFIX, SYSTEM_METHOD } from "@/lib/analysis/prompts";

export const runtime = "nodejs";

/** Contesto completo del progetto, pronto per una conversazione su claude.ai. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { project } = await requireProject(id);
    const context = await buildProjectContext(project);

    const prompt = [
      SYSTEM_METHOD,
      CHAT_SYSTEM_SUFFIX,
      "---",
      `# Contesto del progetto\n\n${context.text}`,
      "---",
      "Ho incollato sopra tutto il materiale del progetto. Confermami che l'hai letto con una riga, poi aspetta le mie domande.",
    ].join("\n\n");

    return NextResponse.json({ prompt, chars: prompt.length, warnings: context.warnings });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
