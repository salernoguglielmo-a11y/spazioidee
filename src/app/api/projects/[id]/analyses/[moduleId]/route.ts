import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { getAnalysis, saveHumanVersion, setScore } from "@/lib/data/analyses";
import { touchProject } from "@/lib/data/projects";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; moduleId: string }> },
) {
  try {
    const { id, moduleId } = await ctx.params;
    const { user } = await requireProject(id);
    const analysis = await getAnalysis(id, moduleId);
    if (!analysis) return notFoundResponse();

    const body = await request.json();

    // Aggiornamento del solo punteggio (usato quando l'analisi arriva dalla modalità manuale).
    if (body.markdown === undefined && (body.score !== undefined || body.confidence !== undefined)) {
      const raw = Number(body.score);
      const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
      const confidence = ["bassa", "media", "alta"].includes(String(body.confidence))
        ? String(body.confidence)
        : null;
      await setScore(id, moduleId, score, confidence);
      await touchProject(id);
      await audit(user.email, "analysis.punteggio", `${id}/${moduleId}`, String(score ?? "n.d."));
      return NextResponse.json({ ok: true, analysis: await getAnalysis(id, moduleId) });
    }

    const markdown = String(body.markdown ?? "").trim();
    const status = body.status === "validata" ? "validata" : "in_revisione";
    if (!markdown) {
      return NextResponse.json({ error: "Il testo non può essere vuoto." }, { status: 400 });
    }

    await saveHumanVersion(id, moduleId, markdown, status, user.email);
    await touchProject(id);
    await audit(user.email, `analysis.${status}`, `${id}/${moduleId}`, null);
    return NextResponse.json({ ok: true, analysis: await getAnalysis(id, moduleId) });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
