import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { addMember, listMembers, removeMember } from "@/lib/data/members";
import { isValidEmail, lookupAllowed, normalizeEmail, audit } from "@/lib/auth/allowlist";
import type { SessionUser } from "@/lib/auth/session";
import type { Project } from "@/lib/data/types";

export const runtime = "nodejs";

/** Solo chi ha creato il progetto, o un amministratore, cambia i membri. */
function canManage(user: SessionUser, project: Project): boolean {
  return user.role === "admin" || project.owner_email === user.email;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireProject(id);
    return NextResponse.json({ members: await listMembers(id) });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, project } = await requireProject(id);
    if (!canManage(user, project)) {
      return NextResponse.json(
        { error: "Solo chi ha creato il progetto può gestirne i membri." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Indirizzo non valido." }, { status: 400 });
    }
    // Si può condividere solo con chi ha già accesso allo spazio.
    const { allowed } = await lookupAllowed(email);
    if (!allowed) {
      return NextResponse.json(
        { error: "Questo indirizzo non è autorizzato ad accedere allo spazio: aggiungilo prima in /admin." },
        { status: 400 },
      );
    }

    await addMember(id, email, user.email);
    await audit(user.email, "progetto.membro_aggiunto", `${id}/${email}`, project.name);
    return NextResponse.json({ members: await listMembers(id) });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, project } = await requireProject(id);
    if (!canManage(user, project)) {
      return NextResponse.json(
        { error: "Solo chi ha creato il progetto può gestirne i membri." },
        { status: 403 },
      );
    }
    const email = normalizeEmail(new URL(request.url).searchParams.get("email") ?? "");
    if (!email) return NextResponse.json({ error: "Indirizzo mancante." }, { status: 400 });
    if (email === project.owner_email) {
      return NextResponse.json(
        { error: "Chi ha creato il progetto non può essere rimosso." },
        { status: 400 },
      );
    }
    await removeMember(id, email);
    await audit(user.email, "progetto.membro_rimosso", `${id}/${email}`, project.name);
    return NextResponse.json({ members: await listMembers(id) });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
