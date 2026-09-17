import type Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { listDocuments } from "../data/documents";
import { listAnalyses, listInsights, listQuestions } from "../data/analyses";
import { readStoredFile } from "../documents/storage";
import { getModule } from "./modules";
import type { Project } from "../data/types";

export type BuiltContext = {
  blocks: Anthropic.ContentBlockParam[];
  warnings: string[];
  stats: { documents: number; chars: number; nativePdfs: number; answeredQuestions: number };
};

function projectCard(project: Project): string {
  const rows: [string, string | null][] = [
    ["Nome", project.name],
    ["In una riga", project.one_liner],
    ["Settore", project.sector],
    ["Fase", project.stage],
    ["Mercato geografico", project.geography],
    ["Modello di business", project.business_model],
    ["Obiettivo dell'analisi", project.goal],
  ];
  const body = rows
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `- **${label}**: ${value}`)
    .join("\n");
  return `# Scheda progetto\n${body}`;
}

/** Riduce un testo lungo mantenendo inizio e fine, con marcatore esplicito. */
function clip(text: string, budget: number): { text: string; clipped: boolean } {
  if (text.length <= budget) return { text, clipped: false };
  const head = Math.floor(budget * 0.65);
  const tail = budget - head;
  return {
    text: `${text.slice(0, head)}\n\n[... porzione centrale omessa per limiti di contesto: ${
      text.length - budget
    } caratteri ...]\n\n${text.slice(-tail)}`,
    clipped: true,
  };
}

/**
 * Costruisce il contesto condiviso da tutte le chiamate al modello:
 * scheda progetto, documenti, analisi validate, risposte dell'utente.
 * L'ultimo blocco porta cache_control, così il prefisso viene riusato
 * tra un modulo e l'altro e tra i turni di dialogo.
 */
export async function buildProjectContext(project: Project): Promise<BuiltContext> {
  const warnings: string[] = [];
  const blocks: Anthropic.ContentBlockParam[] = [];

  const documents = await listDocuments(project.id);
  const analyses = await listAnalyses(project.id);
  const questions = await listQuestions(project.id);
  const insights = await listInsights(project.id);

  const textDocs = documents.filter((d) => d.status === "ok" && d.content.trim().length > 0);
  const totalChars = textDocs.reduce((sum, d) => sum + d.content.length, 0);
  const perDocBudget =
    totalChars > env.contextCharBudget
      ? Math.floor(env.contextCharBudget / Math.max(textDocs.length, 1))
      : Number.POSITIVE_INFINITY;

  const docSections: string[] = [];
  for (const doc of textDocs) {
    const { text, clipped } = clip(doc.content, perDocBudget);
    if (clipped) {
      warnings.push(
        `"${doc.filename}" supera il budget di contesto: una parte centrale non è stata inviata al modello.`,
      );
    }
    docSections.push(
      `<documento file="${doc.filename}" tipo="${doc.kind}" caratteri="${doc.chars}">\n${text}\n</documento>`,
    );
  }

  // PDF senza testo estraibile (deck di immagini, scansioni): inviati nativi.
  let nativePdfs = 0;
  if (env.nativePdf) {
    const visualPdfs = documents.filter(
      (d) =>
        d.status !== "ok" &&
        d.filename.toLowerCase().endsWith(".pdf") &&
        d.storage_path &&
        d.size <= env.nativePdfMaxMb * 1024 * 1024,
    );
    for (const doc of visualPdfs.slice(0, env.nativePdfMaxDocs)) {
      const buffer = await readStoredFile(doc.storage_path!);
      if (!buffer) continue;
      blocks.push({
        type: "document",
        title: doc.filename,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      });
      nativePdfs += 1;
    }
    if (visualPdfs.length > nativePdfs) {
      warnings.push(
        `${visualPdfs.length - nativePdfs} PDF senza testo estraibile non sono stati inviati (limite di dimensione o numero).`,
      );
    }
  }

  const unreadable = documents.filter((d) => d.status === "errore");
  for (const doc of unreadable) {
    warnings.push(`"${doc.filename}" non è stato letto: ${doc.warning ?? "formato non gestito"}.`);
  }

  const validated = analyses
    .filter((a) => a.status === "validata" || a.status === "in_revisione")
    .map((a) => {
      const module = getModule(a.module_id);
      const text = a.human_markdown?.trim() || a.ai_markdown;
      const marker = a.status === "validata" ? "VALIDATA DALL'UMANO" : "in revisione";
      return `<analisi modulo="${module?.name ?? a.module_id}" stato="${marker}" punteggio="${
        a.score ?? "n.d."
      }">\n${clip(text, 8000).text}\n</analisi>`;
    });

  const answered = questions.filter((q) => q.status === "risposta" && q.answer);
  const qa = answered.map((q) => {
    const module = getModule(q.module_id);
    return `- [${module?.name ?? q.module_id}] D: ${q.text}\n  R (imprenditore): ${q.answer}`;
  });

  const notes = insights.map((i) => `- ${i.content}`);

  const ledger: string[] = [];
  if (docSections.length) {
    ledger.push(`# Documentazione caricata\n${docSections.join("\n\n")}`);
  } else if (nativePdfs === 0) {
    ledger.push(
      "# Documentazione caricata\nNessun documento leggibile è stato caricato: lavora su quanto dichiarato nella scheda progetto e nel dialogo, e dichiara esplicitamente questo limite.",
    );
  }
  if (validated.length) {
    ledger.push(`# Analisi già prodotte su altri moduli\n${validated.join("\n\n")}`);
  }
  if (qa.length) {
    ledger.push(
      `# Risposte fornite dall'imprenditore (fonte prevalente sui documenti)\n${qa.join("\n")}`,
    );
  }
  if (notes.length) {
    ledger.push(`# Note e informazioni aggiunte dall'imprenditore\n${notes.join("\n")}`);
  }

  blocks.push({
    type: "text",
    text: `${projectCard(project)}\n\n${ledger.join("\n\n")}`,
    cache_control: { type: "ephemeral" },
  });

  return {
    blocks,
    warnings,
    stats: {
      documents: textDocs.length + nativePdfs,
      chars: totalChars,
      nativePdfs,
      answeredQuestions: answered.length,
    },
  };
}
