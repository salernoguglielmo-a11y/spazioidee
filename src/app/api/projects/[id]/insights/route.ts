import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { addInsight, deleteInsight, listInsights } from "@/lib/data/analyses";
import { touchProject } from "@/lib/data/projects";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user } = await requireProject(id);
    const body = await request.json();
    const content = String(body.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "Nota vuota." }, { status: 400 });
    await addInsight(id, content, user.email, body.moduleId ?? null);
    await touchProject(id);
    return NextResponse.json({ insights: await listInsights(id) });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireProject(id);
    const insightId = new URL(request.url).searchParams.get("insightId");
    if (insightId) await deleteInsight(insightId);
    return NextResponse.json({ insights: await listInsights(id) });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
