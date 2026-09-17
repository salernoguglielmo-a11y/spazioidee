import { newId, nowIso, queryAll, queryOne, run } from "../db";
import type { DocumentRecord } from "./types";

const LIGHT_COLUMNS =
  "id, project_id, filename, mime, size, kind, storage_path, content, NULL as raw_b64, chars, status, warning, uploaded_by, created_at";

/** Elenco senza il binario dei PDF: quello si carica solo quando serve. */
export async function listDocuments(projectId: string): Promise<DocumentRecord[]> {
  return queryAll<DocumentRecord>(
    `SELECT ${LIGHT_COLUMNS} FROM documents WHERE project_id = ? ORDER BY created_at ASC`,
    [projectId],
  );
}

/** PDF conservato nel database quando il disco non è persistente (deploy serverless). */
export async function getDocumentRawB64(id: string): Promise<string | null> {
  const row = await queryOne<{ raw_b64: string | null }>(
    "SELECT raw_b64 FROM documents WHERE id = ?",
    [id],
  );
  return row?.raw_b64 ?? null;
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  return queryOne<DocumentRecord>(`SELECT ${LIGHT_COLUMNS} FROM documents WHERE id = ?`, [id]);
}

export async function insertDocument(
  doc: Omit<DocumentRecord, "id" | "created_at">,
): Promise<DocumentRecord> {
  const id = newId("doc");
  await run(
    `INSERT INTO documents
      (id, project_id, filename, mime, size, kind, storage_path, content, raw_b64, chars, status, warning, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      doc.project_id,
      doc.filename,
      doc.mime,
      doc.size,
      doc.kind,
      doc.storage_path,
      doc.content,
      doc.raw_b64,
      doc.chars,
      doc.status,
      doc.warning,
      doc.uploaded_by,
      nowIso(),
    ],
  );
  const created = await getDocument(id);
  if (!created) throw new Error("Salvataggio documento fallito");
  return created;
}

export async function deleteDocument(id: string): Promise<void> {
  await run("DELETE FROM documents WHERE id = ?", [id]);
}

export async function updateDocumentKind(id: string, kind: string): Promise<void> {
  await run("UPDATE documents SET kind = ? WHERE id = ?", [kind, id]);
}
