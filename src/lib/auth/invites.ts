import { createHash, randomBytes } from "node:crypto";
import { newId, nowIso, queryAll, queryOne, run } from "../db";
import { env } from "../env";
import { audit, normalizeEmail } from "./allowlist";

/**
 * Link di accesso personale: alternativa al link via email, per quando non
 * c'è (o non si vuole) un servizio di posta. Vale come una chiave di casa —
 * chi ce l'ha entra — ma è nominale, revocabile e vincolato all'allowlist:
 * se l'indirizzo viene tolto, il link smette di funzionare all'istante.
 */

export type Invite = {
  id: string;
  email: string;
  label: string | null;
  created_by: string | null;
  created_at: string;
  last_used: string | null;
  uses: number;
  revoked: number;
};

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvite(
  email: string,
  createdBy: string,
  label?: string,
): Promise<{ id: string; url: string }> {
  const normalized = normalizeEmail(email);
  const token = randomBytes(32).toString("base64url");
  const id = newId("inv");

  await run(
    `INSERT INTO invites (id, email, token_hash, label, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, normalized, hash(token), label ?? null, createdBy, nowIso()],
  );
  await audit(createdBy, "invito.creato", normalized, label ?? null);

  return { id, url: `${env.appUrl}/api/auth/invito?t=${encodeURIComponent(token)}` };
}

export async function consumeInvite(token: string): Promise<string | null> {
  const row = await queryOne<{ id: string; email: string; revoked: number }>(
    "SELECT id, email, revoked FROM invites WHERE token_hash = ?",
    [hash(token)],
  );
  if (!row || row.revoked) return null;

  await run("UPDATE invites SET last_used = ?, uses = uses + 1 WHERE id = ?", [nowIso(), row.id]);
  return row.email;
}

export async function listInvites(): Promise<Invite[]> {
  return queryAll<Invite>(
    "SELECT id, email, label, created_by, created_at, last_used, uses, revoked FROM invites ORDER BY created_at DESC",
  );
}

export async function revokeInvite(id: string, actor: string): Promise<void> {
  await run("UPDATE invites SET revoked = 1 WHERE id = ?", [id]);
  await audit(actor, "invito.revocato", id, null);
}
