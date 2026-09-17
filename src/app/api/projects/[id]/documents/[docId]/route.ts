import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { deleteDocument, getDocument, updateDocumentKind } from "@/lib/data/documents";
import { removeStoredFile } from "@/lib/documents/storage";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await ctx.params;
    await requireProject(id);
    const body = await request.json();
    if (typeof body.kind === "string") await updateDocumentKind(docId, body.kind);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await ctx.params;
    const { user } = await requireProject(id);
    const doc = await getDocument(docId);
    if (!doc || doc.project_id !== id) return notFoundResponse();
    await removeStoredFile(doc.storage_path);
    await deleteDocument(docId);
    await audit(user.email, "document.delete", id, doc.filename);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
