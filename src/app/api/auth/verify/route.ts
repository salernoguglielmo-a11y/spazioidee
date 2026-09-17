import { NextResponse } from "next/server";
import { consumeMagicLink, purgeExpiredTokens } from "@/lib/auth/magic-link";
import { audit, lookupAllowed, normalizeEmail } from "@/lib/auth/allowlist";
import { setSessionCookie } from "@/lib/auth/session";
import { nowIso, run } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const email = normalizeEmail(url.searchParams.get("email") ?? "");

  const fail = (message: string) =>
    NextResponse.redirect(`${env.appUrl}/login?error=${encodeURIComponent(message)}`);

  if (!token || !email) return fail("Link incompleto.");

  // L'allowlist viene ricontrollata al momento dell'accesso: una revoca ha effetto immediato.
  const { allowed, role } = await lookupAllowed(email);
  if (!allowed) return fail("Questo indirizzo non è più autorizzato.");

  const consumed = await consumeMagicLink(email, token);
  if (!consumed.ok) return fail(consumed.error);

  await run(
    `INSERT INTO users (email, created_at, last_login) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET last_login = excluded.last_login`,
    [email, nowIso(), nowIso()],
  );
  await setSessionCookie({ email, role });
  await audit(email, "auth.login", email, role);
  await purgeExpiredTokens();

  return NextResponse.redirect(`${env.appUrl}/`);
}
