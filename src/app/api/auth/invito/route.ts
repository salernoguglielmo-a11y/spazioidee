import { NextResponse } from "next/server";
import { consumeInvite } from "@/lib/auth/invites";
import { audit, lookupAllowed } from "@/lib/auth/allowlist";
import { setSessionCookie } from "@/lib/auth/session";
import { nowIso, run } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** Accesso tramite link personale: apre una sessione come il link via email. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const fail = (message: string) =>
    NextResponse.redirect(`${env.appUrl}/login?error=${encodeURIComponent(message)}`);

  if (!token) return fail("Link di accesso incompleto.");

  const email = await consumeInvite(token);
  if (!email) return fail("Link di accesso non valido o revocato.");

  // L'allowlist resta l'autorità: un indirizzo rimosso non entra comunque.
  const { allowed, role } = await lookupAllowed(email);
  if (!allowed) return fail("Questo indirizzo non è più autorizzato.");

  await run(
    `INSERT INTO users (email, created_at, last_login) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET last_login = excluded.last_login`,
    [email, nowIso(), nowIso()],
  );
  await setSessionCookie({ email, role });
  await audit(email, "auth.login_invito", email, role);

  return NextResponse.redirect(`${env.appUrl}/`);
}
