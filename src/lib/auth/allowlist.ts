import { newId, nowIso, queryAll, queryOne, run } from "../db";
import { env } from "../env";

export type AllowlistEntry = {
  email: string;
  role: "admin" | "member";
  note: string | null;
  added_by: string | null;
  created_at: string;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Unica porta d'accesso: nessun indirizzo fuori allowlist entra nel sistema. */
export async function lookupAllowed(
  email: string,
): Promise<{ allowed: boolean; role: "admin" | "member" }> {
  const normalized = normalizeEmail(email);
  if (env.adminEmails.includes(normalized)) return { allowed: true, role: "admin" };
  const row = await queryOne<{ role: string }>(
    "SELECT role FROM allowlist WHERE email = ?",
    [normalized],
  );
  if (row) return { allowed: true, role: row.role === "admin" ? "admin" : "member" };
  if (env.allowedEmails.includes(normalized)) return { allowed: true, role: "member" };
  return { allowed: false, role: "member" };
}

export async function listAllowlist(): Promise<AllowlistEntry[]> {
  return queryAll<AllowlistEntry>(
    "SELECT email, role, note, added_by, created_at FROM allowlist ORDER BY role DESC, email ASC",
  );
}

export async function addToAllowlist(
  email: string,
  role: "admin" | "member",
  addedBy: string,
  note?: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  await run(
    `INSERT INTO allowlist (email, role, note, added_by, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET role = excluded.role, note = excluded.note`,
    [normalized, role, note ?? null, addedBy, nowIso()],
  );
  await audit(addedBy, "allowlist.add", normalized, role);
}

export async function removeFromAllowlist(email: string, actor: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await run("DELETE FROM allowlist WHERE email = ?", [normalized]);
  await audit(actor, "allowlist.remove", normalized, null);
}

/** Indirizzi bloccati a livello di configurazione: rimovibili solo da .env. */
export function isEnvManaged(email: string): boolean {
  const normalized = normalizeEmail(email);
  return env.adminEmails.includes(normalized) || env.allowedEmails.includes(normalized);
}

export async function audit(
  actor: string | null,
  action: string,
  target: string | null,
  detail: string | null,
): Promise<void> {
  await run(
    "INSERT INTO audit_log (id, actor, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [newId("log"), actor, action, target, detail, nowIso()],
  );
}
