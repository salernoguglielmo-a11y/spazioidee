import { newId, nowIso, parseJson, queryAll, queryOne, run } from "../db";
import { env } from "../env";
import type { SessionUser } from "../auth/session";
import { defaultModuleIds } from "../analysis/modules";
import { memberProjectIds } from "./members";
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

/**
 * Chi può entrare nel merito di un progetto: chi lo ha creato, chi è stato
 * aggiunto come membro, e gli amministratori dello spazio. In modalità
 * "shared" la separazione non si applica.
 */
export function canAccess(
  user: SessionUser,
  project: Project,
  memberIds: Set<string>,
): boolean {
  if (env.projectVisibility === "shared") return true;
  if (user.role === "admin") return true;
  if (project.owner_email === user.email) return true;
  return memberIds.has(project.id);
}

export type ProjectListItem = { project: Project; access: boolean };

/**
 * Elenco dei progetti. Di quelli non accessibili restano nome, settore, fase e
 * proprietario: il contenuto dell'idea (descrizione e obiettivo) non esce.
 */
export async function listProjects(
  user: SessionUser,
  includeArchived = false,
): Promise<ProjectListItem[]> {
  const rows = await queryAll<ProjectRow>(
    "SELECT * FROM projects WHERE (archived = 0 OR ?) ORDER BY updated_at DESC",
    [includeArchived ? 1 : 0],
  );
  const memberIds = await memberProjectIds(user.email);

  const items: ProjectListItem[] = [];
  for (const row of rows) {
    const project = toProject(row);
    const access = canAccess(user, project, memberIds);
    if (!access && env.projectVisibility === "private") continue;
    items.push({
      project: access ? project : { ...project, one_liner: null, goal: null },
      access,
    });
  }
  return items;
}

/** Progetto completo, solo se la persona può accedervi. */
export async function getProject(id: string, user: SessionUser): Promise<Project | null> {
  const row = await queryOne<ProjectRow>("SELECT * FROM projects WHERE id = ?", [id]);
  if (!row) return null;
  const project = toProject(row);
  const memberIds = await memberProjectIds(user.email);
  return canAccess(user, project, memberIds) ? project : null;
}

/** Solo i dati già visibili nell'elenco: serve alla pagina "non hai accesso". */
export async function getProjectCard(
  id: string,
  user: SessionUser,
): Promise<{ name: string; owner_email: string; sector: string | null; stage: string | null } | null> {
  if (env.projectVisibility === "private") return null;
  const row = await queryOne<ProjectRow>(
    "SELECT name, owner_email, sector, stage FROM projects WHERE id = ?",
    [id],
  );
  return row
    ? { name: row.name, owner_email: row.owner_email, sector: row.sector, stage: row.stage }
    : null;
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
