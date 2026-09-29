import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { deleteProject, updateProject } from "@/lib/data/projects";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, project: existing } = await requireProject(id);
    const body = await request.json();

    // I membri collaborano sulla scheda; archiviare no: cambia la vista a tutti.
    const canManage = user.role === "admin" || existing.owner_email === user.email;
    if (body.archived !== undefined && !canManage) {
      return NextResponse.json(
        { error: "Solo chi ha creato il progetto può archiviarlo." },
        { status: 403 },
      );
    }

    const project = await updateProject(id, body, user);
    if (!project) return notFoundResponse();
    await audit(user.email, "project.update", id, Object.keys(body).join(","));
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user } = await requireProject(id);
    const deleted = await deleteProject(id, user);
    if (!deleted) {
      return NextResponse.json(
        { error: "Solo chi ha creato il progetto (o un amministratore) può eliminarlo." },
        { status: 403 },
      );
    }
    await audit(user.email, "project.delete", id, null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
