import { newId, nowIso, parseJson, queryAll, queryOne, run } from "../db";
import type { Analysis, AnalysisStatus, ChatMessage, Insight, Question } from "./types";

type AnalysisRow = Omit<Analysis, "strengths" | "risks" | "actions" | "sources"> & {
  strengths: string;
  risks: string;
  actions: string;
  sources: string;
};

function toAnalysis(row: AnalysisRow): Analysis {
  return {
    ...row,
    strengths: parseJson<string[]>(row.strengths, []),
    risks: parseJson<string[]>(row.risks, []),
    actions: parseJson<string[]>(row.actions, []),
    sources: parseJson<{ title: string; url: string }[]>(row.sources, []),
  };
}

export async function listAnalyses(projectId: string): Promise<Analysis[]> {
  const rows = await queryAll<AnalysisRow>("SELECT * FROM analyses WHERE project_id = ?", [
    projectId,
  ]);
  return rows.map(toAnalysis);
}

export async function getAnalysis(projectId: string, moduleId: string): Promise<Analysis | null> {
  const row = await queryOne<AnalysisRow>(
    "SELECT * FROM analyses WHERE project_id = ? AND module_id = ?",
    [projectId, moduleId],
  );
  return row ? toAnalysis(row) : null;
}

export type AnalysisUpsert = {
  ai_markdown: string;
  summary?: string | null;
  score?: number | null;
  confidence?: string | null;
  strengths?: string[];
  risks?: string[];
  actions?: string[];
  sources?: { title: string; url: string }[];
  model?: string | null;
};

/** Salva l'esito di un'esecuzione AI mantenendo eventuale versione umana. */
export async function saveAiAnalysis(
  projectId: string,
  moduleId: string,
  data: AnalysisUpsert,
): Promise<Analysis> {
  const existing = await getAnalysis(projectId, moduleId);
  const now = nowIso();
  if (existing) {
    await run(
      `UPDATE analyses SET ai_markdown = ?, summary = ?, score = ?, confidence = ?, strengths = ?,
        risks = ?, actions = ?, sources = ?, model = ?, run_count = run_count + 1,
        status = CASE WHEN status = 'validata' THEN 'in_revisione' ELSE status END,
        updated_at = ? WHERE id = ?`,
      [
        data.ai_markdown,
        data.summary ?? null,
        data.score ?? null,
        data.confidence ?? null,
        JSON.stringify(data.strengths ?? []),
        JSON.stringify(data.risks ?? []),
        JSON.stringify(data.actions ?? []),
        JSON.stringify(data.sources ?? []),
        data.model ?? null,
        now,
        existing.id,
      ],
    );
  } else {
    await run(
      `INSERT INTO analyses
        (id, project_id, module_id, status, ai_markdown, summary, score, confidence, strengths, risks,
         actions, sources, model, run_count, created_at, updated_at)
       VALUES (?, ?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        newId("ana"),
        projectId,
        moduleId,
        data.ai_markdown,
        data.summary ?? null,
        data.score ?? null,
        data.confidence ?? null,
        JSON.stringify(data.strengths ?? []),
        JSON.stringify(data.risks ?? []),
        JSON.stringify(data.actions ?? []),
        JSON.stringify(data.sources ?? []),
        data.model ?? null,
        now,
        now,
      ],
    );
  }
  const saved = await getAnalysis(projectId, moduleId);
  if (!saved) throw new Error("Salvataggio analisi fallito");
  return saved;
}

/** La versione umana ha sempre la precedenza sul testo generato. */
export async function saveHumanVersion(
  projectId: string,
  moduleId: string,
  markdown: string,
  status: AnalysisStatus,
  user: string,
): Promise<void> {
  const validated = status === "validata";
  await run(
    `UPDATE analyses SET human_markdown = ?, status = ?, validated_by = ?, validated_at = ?, updated_at = ?
     WHERE project_id = ? AND module_id = ?`,
    [
      markdown,
      status,
      validated ? user : null,
      validated ? nowIso() : null,
      nowIso(),
      projectId,
      moduleId,
    ],
  );
}

export async function finalText(analysis: Analysis): Promise<string> {
  return analysis.human_markdown?.trim() ? analysis.human_markdown : analysis.ai_markdown;
}

// ---------------------------------------------------------------- domande

export async function listQuestions(projectId: string): Promise<Question[]> {
  return queryAll<Question>(
    "SELECT * FROM questions WHERE project_id = ? ORDER BY created_at DESC",
    [projectId],
  );
}

export async function replaceModuleQuestions(
  projectId: string,
  moduleId: string,
  questions: { text: string; rationale?: string; priority?: string }[],
): Promise<void> {
  // Le domande senza risposta vengono sostituite; quelle già risposte restano nel registro.
  await run("DELETE FROM questions WHERE project_id = ? AND module_id = ? AND status = 'aperta'", [
    projectId,
    moduleId,
  ]);
  const answered = await queryAll<{ text: string }>(
    "SELECT text FROM questions WHERE project_id = ? AND module_id = ? AND status != 'aperta'",
    [projectId, moduleId],
  );
  const known = new Set(answered.map((q) => q.text.trim().toLowerCase()));
  for (const q of questions) {
    if (known.has(q.text.trim().toLowerCase())) continue;
    await run(
      `INSERT INTO questions (id, project_id, module_id, text, rationale, priority, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'aperta', ?)`,
      [
        newId("qst"),
        projectId,
        moduleId,
        q.text,
        q.rationale ?? null,
        q.priority ?? "media",
        nowIso(),
      ],
    );
  }
}

export async function answerQuestion(
  id: string,
  answer: string,
  user: string,
): Promise<Question | null> {
  await run(
    "UPDATE questions SET answer = ?, status = 'risposta', answered_by = ?, answered_at = ? WHERE id = ?",
    [answer, user, nowIso(), id],
  );
  return queryOne<Question>("SELECT * FROM questions WHERE id = ?", [id]);
}

export async function dismissQuestion(id: string): Promise<void> {
  await run("UPDATE questions SET status = 'archiviata' WHERE id = ?", [id]);
}

// ---------------------------------------------------------------- dialogo

export async function listMessages(projectId: string, limit = 200): Promise<ChatMessage[]> {
  const rows = await queryAll<ChatMessage>(
    "SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC LIMIT ?",
    [projectId, limit],
  );
  return rows;
}

export async function addMessage(
  projectId: string,
  role: "user" | "assistant",
  content: string,
  author: string | null,
  moduleId: string | null = null,
): Promise<void> {
  await run(
    "INSERT INTO messages (id, project_id, module_id, role, content, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [newId("msg"), projectId, moduleId, role, content, author, nowIso()],
  );
}

export async function clearMessages(projectId: string): Promise<void> {
  await run("DELETE FROM messages WHERE project_id = ?", [projectId]);
}

// ---------------------------------------------------------------- insight

export async function listInsights(projectId: string): Promise<Insight[]> {
  return queryAll<Insight>("SELECT * FROM insights WHERE project_id = ? ORDER BY created_at DESC", [
    projectId,
  ]);
}

export async function addInsight(
  projectId: string,
  content: string,
  author: string,
  moduleId: string | null = null,
): Promise<void> {
  await run(
    "INSERT INTO insights (id, project_id, module_id, source, content, author, created_at) VALUES (?, ?, ?, 'umano', ?, ?, ?)",
    [newId("ins"), projectId, moduleId, content, author, nowIso()],
  );
}

export async function deleteInsight(id: string): Promise<void> {
  await run("DELETE FROM insights WHERE id = ?", [id]);
}
