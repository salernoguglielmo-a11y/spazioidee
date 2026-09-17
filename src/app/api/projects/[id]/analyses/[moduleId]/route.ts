import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { getAnalysis, saveHumanVersion } from "@/lib/data/analyses";
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
