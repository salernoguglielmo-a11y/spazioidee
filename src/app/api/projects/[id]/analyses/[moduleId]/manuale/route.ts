import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { getModule } from "@/lib/analysis/modules";
import { parseManualAnalysis } from "@/lib/analysis/manual";
import { replaceModuleQuestions, saveAiAnalysis } from "@/lib/data/analyses";
import { touchProject } from "@/lib/data/projects";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";

/** Salva una risposta prodotta altrove (claude.ai) come se fosse un'analisi. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; moduleId: string }> },
) {
  try {
    const { id, moduleId } = await ctx.params;
    const { user } = await requireProject(id);
    const module = getModule(moduleId);
    if (!module) return notFoundResponse();

    const body = await request.json();
    const markdown = String(body.markdown ?? "").trim();
    if (markdown.length < 80) {
      return NextResponse.json(
        { error: "Il testo incollato è troppo corto per essere un'analisi." },
        { status: 400 },
      );
    }

    const parsed = parseManualAnalysis(markdown);
    const analysis = await saveAiAnalysis(id, moduleId, {
      ai_markdown: markdown,
      summary: parsed.summary,
      score: parsed.score,
      confidence: parsed.confidence,
      strengths: parsed.strengths,
      risks: parsed.risks,
      actions: parsed.actions,
      sources: [],
      model: String(body.origine ?? "claude.ai (modalità manuale)"),
    });

    if (parsed.questions.length) {
      await replaceModuleQuestions(id, moduleId, parsed.questions);
    }
    await touchProject(id);
    await audit(user.email, "analysis.manuale", `${id}/${moduleId}`, `punteggio ${parsed.score ?? "n.d."}`);

    return NextResponse.json({
      analysis,
      parsed: {
        score: parsed.score,
        confidence: parsed.confidence,
        questions: parsed.questions.length,
        strengths: parsed.strengths.length,
        risks: parsed.risks.length,
        actions: parsed.actions.length,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
