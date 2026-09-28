import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { createInvite, listInvites, revokeInvite } from "@/lib/auth/invites";
import { isValidEmail, lookupAllowed, normalizeEmail } from "@/lib/auth/allowlist";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ invites: await listInvites() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Indirizzo non valido." }, { status: 400 });
    }
    // Un link ha senso solo per chi è già autorizzato.
    const { allowed } = await lookupAllowed(email);
    if (!allowed) {
      return NextResponse.json(
        { error: "Aggiungi prima l'indirizzo all'allowlist." },
        { status: 400 },
      );
    }
    const invite = await createInvite(email, admin.email, body.label ? String(body.label) : undefined);
    // L'URL viene mostrato una sola volta: nel database resta solo l'impronta.
    return NextResponse.json({ url: invite.url, invites: await listInvites() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Identificativo mancante." }, { status: 400 });
    await revokeInvite(id, admin.email);
    return NextResponse.json({ invites: await listInvites() });
  } catch (error) {
    return errorResponse(error);
  }
}
