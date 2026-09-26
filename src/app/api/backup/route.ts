import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { queryAll } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Copia completa dei contenuti in un unico file JSON: progetti, documenti
 * (testo estratto), analisi, domande, dialogo, note e allowlist. Esclude i
 * binari dei PDF e i token di accesso.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [projects, documents, analyses, questions, messages, insights, allowlist] =
      await Promise.all([
        queryAll("SELECT * FROM projects"),
        queryAll(
          `SELECT id, project_id, filename, mime, size, kind, content, chars, status, warning,
                  uploaded_by, created_at
           FROM documents`,
        ),
        queryAll("SELECT * FROM analyses"),
        queryAll("SELECT * FROM questions"),
        queryAll("SELECT * FROM messages"),
        queryAll("SELECT * FROM insights"),
        queryAll("SELECT email, role, note, created_at FROM allowlist"),
      ]);

    const backup = {
      applicazione: "Spazio Idee",
      versione_formato: 1,
      esportato_il: new Date().toISOString(),
      contenuto: { projects, documents, analyses, questions, messages, insights, allowlist },
    };

    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="spazioidee-backup-${date}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
