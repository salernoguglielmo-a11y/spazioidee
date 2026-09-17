import { createHash, randomBytes } from "node:crypto";
import { newId, nowIso, queryAll, queryOne, run } from "../db";
import { env } from "../env";
import { normalizeEmail } from "./allowlist";

const TOKEN_TTL_MINUTES = 15;
const MAX_REQUESTS_PER_HOUR = 5;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueMagicLink(email: string): Promise<{ url: string } | { error: string }> {
  const normalized = normalizeEmail(email);

  const recent = await queryAll<{ n: number }>(
    "SELECT COUNT(*) as n FROM login_tokens WHERE email = ? AND created_at > ?",
    [normalized, new Date(Date.now() - 60 * 60 * 1000).toISOString()],
  );
  if ((recent[0]?.n ?? 0) >= MAX_REQUESTS_PER_HOUR) {
    return { error: "Troppi tentativi di accesso. Riprova tra un'ora." };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  await run(
    `INSERT INTO login_tokens (id, email, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [newId("tok"), normalized, hashToken(token), expiresAt, nowIso()],
  );

  const url = `${env.appUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalized)}`;
  return { url };
}

/** Consuma il token: valido una sola volta, entro la scadenza. */
export async function consumeMagicLink(
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);
  const row = await queryOne<{ id: string; expires_at: string; used_at: string | null }>(
    "SELECT id, expires_at, used_at FROM login_tokens WHERE email = ? AND token_hash = ?",
    [normalized, hashToken(token)],
  );
  if (!row) return { ok: false, error: "Link non valido." };
  if (row.used_at) return { ok: false, error: "Link già utilizzato. Richiedine uno nuovo." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Link scaduto. Richiedine uno nuovo." };
  }
  await run("UPDATE login_tokens SET used_at = ? WHERE id = ?", [nowIso(), row.id]);
  return { ok: true };
}

export async function purgeExpiredTokens(): Promise<void> {
  await run("DELETE FROM login_tokens WHERE expires_at < ?", [
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  ]);
}
