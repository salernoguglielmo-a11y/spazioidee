import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError, requireUser, type SessionUser } from "./auth/session";
import { getProject } from "./data/projects";
import type { Project } from "./data/types";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
  }
  console.error(error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Errore imprevisto" },
    { status: 500 },
  );
}

/** Utente + progetto, o eccezione gestita dal chiamante. */
export async function requireProject(
  projectId: string,
): Promise<{ user: SessionUser; project: Project }> {
  const user = await requireUser();
  const project = await getProject(projectId, user);
  if (!project) throw new NotFoundError();
  return { user, project };
}

export class NotFoundError extends Error {
  constructor() {
    super("Progetto non trovato");
  }
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Non trovato" }, { status: 404 });
}
