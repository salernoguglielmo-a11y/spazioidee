import { newId, nowIso, parseJson, queryAll, queryOne, run } from "../db";
import { env } from "../env";
import type { SessionUser } from "../auth/session";
import { defaultModuleIds } from "../analysis/modules";
import type { Project } from "./types";

type ProjectRow = Omit<Project, "modules" | "archived"> & {
  modules: string;
  archived: number;
};

function toProject(row: ProjectRow): Project {
  return {
    ...row,
    modules: parseJson<string[]>(row.modules, []),
    archived: Boolean(row.archived),
  };
}

function visibilityClause(user: SessionUser): { sql: string; args: unknown[] } {
  if (env.projectVisibility === "shared" || user.role === "admin") {
    return { sql: "", args: [] };
  }
  return { sql: " AND owner_email = ?", args: [user.email] };
}

export async function listProjects(user: SessionUser, includeArchived = false): Promise<Project[]> {
  const vis = visibilityClause(user);
  const rows = await queryAll<ProjectRow>(
    `SELECT * FROM projects WHERE (archived = 0 OR ?)${vis.sql} ORDER BY updated_at DESC`,
    [includeArchived ? 1 : 0, ...vis.args],
  );
  return rows.map(toProject);
}

export async function getProject(id: string, user: SessionUser): Promise<Project | null> {
  const vis = visibilityClause(user);
  const row = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = ?${vis.sql}`, [
    id,
    ...vis.args,
  ]);
  return row ? toProject(row) : null;
}

export type ProjectInput = {
  name: string;
  one_liner?: string;
  sector?: string;
  stage?: string;
  geography?: string;
  business_model?: string;
  goal?: string;
  modules?: string[];
};

export async function createProject(input: ProjectInput, user: SessionUser): Promise<Project> {
  const id = newId("prj");
  const now = nowIso();
  const modules = input.modules?.length ? input.modules : defaultModuleIds();
  await run(
    `INSERT INTO projects
      (id, name, one_liner, sector, stage, geography, business_model, goal, modules, owner_email, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      input.name,
      input.one_liner ?? null,
      input.sector ?? null,
      input.stage ?? null,
      input.geography ?? null,
      input.business_model ?? null,
      input.goal ?? null,
      JSON.stringify(modules),
      user.email,
      now,
      now,
    ],
  );
  const project = await getProject(id, user);
  if (!project) throw new Error("Creazione progetto fallita");
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInput> & { archived?: boolean },
  user: SessionUser,
): Promise<Project | null> {
  const existing = await getProject(id, user);
  if (!existing) return null;
  const merged = {
    name: patch.name ?? existing.name,
    one_liner: patch.one_liner ?? existing.one_liner,
    sector: patch.sector ?? existing.sector,
    stage: patch.stage ?? existing.stage,
    geography: patch.geography ?? existing.geography,
    business_model: patch.business_model ?? existing.business_model,
    goal: patch.goal ?? existing.goal,
    modules: patch.modules ?? existing.modules,
    archived: patch.archived ?? existing.archived,
  };
  await run(
    `UPDATE projects SET name = ?, one_liner = ?, sector = ?, stage = ?, geography = ?,
      business_model = ?, goal = ?, modules = ?, archived = ?, updated_at = ? WHERE id = ?`,
    [
      merged.name,
      merged.one_liner,
      merged.sector,
      merged.stage,
      merged.geography,
      merged.business_model,
      merged.goal,
      JSON.stringify(merged.modules),
      merged.archived ? 1 : 0,
      nowIso(),
      id,
    ],
  );
  return getProject(id, user);
}

export async function touchProject(id: string): Promise<void> {
  await run("UPDATE projects SET updated_at = ? WHERE id = ?", [nowIso(), id]);
}

export async function deleteProject(id: string, user: SessionUser): Promise<boolean> {
  const project = await getProject(id, user);
  if (!project) return false;
  if (user.role !== "admin" && project.owner_email !== user.email) return false;
  for (const table of ["documents", "analyses", "questions", "messages", "insights"]) {
    await run(`DELETE FROM ${table} WHERE project_id = ?`, [id]);
  }
  await run("DELETE FROM projects WHERE id = ?", [id]);
  return true;
}
