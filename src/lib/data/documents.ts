import { newId, nowIso, queryAll, queryOne, run } from "../db";
import type { DocumentRecord } from "./types";

export async function listDocuments(projectId: string): Promise<DocumentRecord[]> {
  return queryAll<DocumentRecord>(
    "SELECT * FROM documents WHERE project_id = ? ORDER BY created_at ASC",
    [projectId],
  );
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  return queryOne<DocumentRecord>("SELECT * FROM documents WHERE id = ?", [id]);
}

export async function insertDocument(
  doc: Omit<DocumentRecord, "id" | "created_at">,
): Promise<DocumentRecord> {
  const id = newId("doc");
  await run(
    `INSERT INTO documents
      (id, project_id, filename, mime, size, kind, storage_path, content, chars, status, warning, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      doc.project_id,
      doc.filename,
      doc.mime,
      doc.size,
      doc.kind,
      doc.storage_path,
      doc.content,
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
