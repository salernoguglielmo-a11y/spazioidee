import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Chiusura di sessione via GET: serve quando una pagina scopre che
 * l'indirizzo non è più autorizzato (una pagina non può cancellare cookie).
 */
export async function GET(request: Request) {
  await clearSessionCookie();
  const reason =
    new URL(request.url).searchParams.get("motivo") ?? "Sessione terminata.";
  return NextResponse.redirect(`${env.appUrl}/login?error=${encodeURIComponent(reason)}`);
}
