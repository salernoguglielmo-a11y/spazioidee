import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export const SESSION_COOKIE = "spazioidee_session";

export type SessionUser = {
  email: string;
  name?: string;
  role: "admin" | "member";
};

function secretKey(): Uint8Array {
  if (!env.authSecret) {
    throw new Error(
      "AUTH_SECRET non configurato: impossibile firmare le sessioni. Aggiungilo in .env.local",
    );
  }
  return new TextEncoder().encode(env.authSecret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name ?? "", role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setSubject(user.email)
    .setExpirationTime(`${env.sessionDays}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = String(payload.email ?? "");
    if (!email) return null;
    return {
      email,
      name: (payload.name as string) || undefined,
      role: payload.role === "admin" ? "admin" : "member",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: env.sessionDays * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Utente della richiesta corrente, oppure null. */
export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Ricontrolla l'allowlist a ogni richiesta: revocare un indirizzo ha effetto
 * immediato anche sulle sessioni già aperte, e una promozione ad
 * amministratore non richiede un nuovo accesso.
 */
async function refreshFromAllowlist(user: SessionUser): Promise<SessionUser | null> {
  const { lookupAllowed } = await import("./allowlist");
  const { allowed, role } = await lookupAllowed(user.email);
  if (!allowed) return null;
  return { ...user, role };
}

/** Come currentUser, ma lancia: da usare nelle route API. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  const refreshed = await refreshFromAllowlist(user);
  if (!refreshed) {
    await clearSessionCookie();
    throw new UnauthorizedError();
  }
  return refreshed;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

/**
 * Variante per le pagine: invece di sollevare, rimanda al login.
 * Le route API usano requireUser/requireAdmin.
 */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const refreshed = await refreshFromAllowlist(user);
  if (!refreshed) {
    // Una pagina non può cancellare cookie: lo fa la route di uscita.
    redirect(
      `/api/auth/signout?motivo=${encodeURIComponent("Questo indirizzo non è più autorizzato.")}`,
    );
  }
  return refreshed;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Non autenticato");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Permessi insufficienti");
  }
}
