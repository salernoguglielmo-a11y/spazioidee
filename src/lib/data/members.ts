import { nowIso, queryAll, run } from "../db";
import { normalizeEmail } from "../auth/allowlist";

export type Member = {
  project_id: string;
  email: string;
  added_by: string | null;
  created_at: string;
};

export async function listMembers(projectId: string): Promise<Member[]> {
  return queryAll<Member>(
    "SELECT project_id, email, added_by, created_at FROM project_members WHERE project_id = ? ORDER BY created_at ASC",
    [projectId],
  );
}

export async function addMember(
  projectId: string,
  email: string,
  addedBy: string,
): Promise<void> {
  await run(
    `INSERT INTO project_members (project_id, email, added_by, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(project_id, email) DO NOTHING`,
    [projectId, normalizeEmail(email), addedBy, nowIso()],
  );
}

export async function removeMember(projectId: string, email: string): Promise<void> {
  await run("DELETE FROM project_members WHERE project_id = ? AND email = ?", [
    projectId,
    normalizeEmail(email),
  ]);
}

/** Progetti di cui la persona è membro esplicito. */
export async function memberProjectIds(email: string): Promise<Set<string>> {
  const rows = await queryAll<{ project_id: string }>(
    "SELECT project_id FROM project_members WHERE email = ?",
    [normalizeEmail(email)],
  );
  return new Set(rows.map((r) => r.project_id));
}
