import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { clearMessages, listMessages } from "@/lib/data/analyses";
import { runChatTurn } from "@/lib/analysis/runner";
import { sseResponse } from "@/lib/sse";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, project } = await requireProject(id);
    const body = await request.json();
    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Messaggio vuoto." }, { status: 400 });
    }

    const history = await listMessages(id);

    return sseResponse(async (send) => {
      await runChatTurn(project, history, message, user.email, send);
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireProject(id);
    await clearMessages(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
