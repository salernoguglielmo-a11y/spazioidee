import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  addToAllowlist,
  isEnvManaged,
  isValidEmail,
  listAllowlist,
  normalizeEmail,
  removeFromAllowlist,
} from "@/lib/auth/allowlist";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ entries: await listAllowlist() });
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
    const role = body.role === "admin" ? "admin" : "member";
    await addToAllowlist(email, role, admin.email, body.note ? String(body.note) : undefined);
    return NextResponse.json({ entries: await listAllowlist() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const email = normalizeEmail(new URL(request.url).searchParams.get("email") ?? "");
    if (!email) return NextResponse.json({ error: "Indirizzo mancante." }, { status: 400 });
    if (email === admin.email) {
      return NextResponse.json({ error: "Non puoi rimuovere te stesso." }, { status: 400 });
    }
    if (isEnvManaged(email)) {
      return NextResponse.json(
        {
          error:
            "Questo indirizzo è definito nelle variabili d'ambiente: rimuovilo da ALLOWED_EMAILS/ADMIN_EMAILS e riavvia l'applicazione.",
        },
        { status: 400 },
      );
    }
    await removeFromAllowlist(email, admin.email);
    return NextResponse.json({ entries: await listAllowlist() });
  } catch (error) {
    return errorResponse(error);
  }
}
