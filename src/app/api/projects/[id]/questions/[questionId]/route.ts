import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { answerQuestion, dismissQuestion } from "@/lib/data/analyses";
import { touchProject } from "@/lib/data/projects";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; questionId: string }> },
) {
  try {
    const { id, questionId } = await ctx.params;
    const { user } = await requireProject(id);
    const body = await request.json();

    if (body.action === "archivia") {
      const done = await dismissQuestion(id, questionId);
      if (!done) return notFoundResponse();
      return NextResponse.json({ ok: true });
    }

    const answer = String(body.answer ?? "").trim();
    if (!answer) {
      return NextResponse.json({ error: "La risposta non può essere vuota." }, { status: 400 });
    }
    const question = await answerQuestion(id, questionId, answer, user.email);
    if (!question) return notFoundResponse();
    await touchProject(id);
    await audit(user.email, "question.answer", `${id}/${questionId}`, null);
    return NextResponse.json({ ok: true, question });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
