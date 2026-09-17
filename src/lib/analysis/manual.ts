import type { AnalysisModule } from "./modules";
import { SYSTEM_METHOD, moduleUserPrompt } from "./prompts";

/**
 * Modalità manuale: l'applicazione prepara il prompt completo, la persona lo
 * incolla su claude.ai (o su qualsiasi altro assistente) e riporta indietro la
 * risposta. Tutto il resto — punteggi, domande, dossier, validazione — funziona
 * esattamente come con la chiamata automatica.
 */

const MANUAL_FOOTER = `## Due righe finali, obbligatorie
Chiudi la risposta con queste due righe esatte, che servono a registrare la valutazione:

PUNTEGGIO: <numero da 0 a 100>
FIDUCIA: <bassa | media | alta>`;

export type ManualPromptMode = "completo" | "istruzioni";

export function buildManualPrompt(
  module: AnalysisModule,
  contextText: string,
  mode: ManualPromptMode,
  options?: { focus?: string; isRerun?: boolean },
): string {
  const parts: string[] = [SYSTEM_METHOD];

  if (mode === "completo") {
    parts.push(
      `---\n\n# Contesto del progetto\n\n${contextText}`,
    );
  } else {
    parts.push(
      `---\n\n# Contesto del progetto\n\nI documenti del progetto sono allegati a questo messaggio: leggili prima di rispondere.\n\n${contextText}`,
    );
  }

  parts.push("---");
  parts.push(moduleUserPrompt(module, options));

  if (module.web) {
    parts.push(
      `## Nota sulla ricerca\nSe l'assistente che stai usando può cercare sul web, usalo per verificare dati di mercato, competitor e riferimenti normativi, citando fonte e anno.`,
    );
  }

  parts.push(MANUAL_FOOTER);
  return parts.join("\n\n");
}

export type ParsedAnalysis = {
  summary: string | null;
  score: number | null;
  confidence: string | null;
  strengths: string[];
  risks: string[];
  actions: string[];
  questions: { text: string; rationale: string; priority: string }[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Spezza il markdown in sezioni usando i titoli di qualsiasi livello. */
function sections(markdown: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = markdown.split("\n");
  let current = "";
  let buffer: string[] = [];

  const flush = () => {
    if (current) map.set(current, buffer.join("\n").trim());
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    const bold = /^\*\*(.+?)\*\*\s*$/.exec(line);
    const title = heading?.[1] ?? bold?.[1];
    if (title) {
      flush();
      current = normalize(title.replace(/[*_`]/g, ""));
      continue;
    }
    buffer.push(line);
  }
  flush();
  return map;
}

function find(map: Map<string, string>, ...keywords: string[]): string {
  for (const [key, value] of map) {
    if (keywords.some((keyword) => key.includes(keyword))) return value;
  }
  return "";
}

function bullets(text: string, limit: number): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^([-*•]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * Legge una risposta incollata dall'utente e ne ricava gli stessi dati
 * strutturati che, con la chiave API, verrebbero estratti automaticamente.
 * Tollerante: se una sezione manca, resta semplicemente vuota.
 */
export function parseManualAnalysis(markdown: string): ParsedAnalysis {
  const map = sections(markdown);

  const scoreMatch = /punteggio\s*[:\-–]?\s*(\d{1,3})/i.exec(markdown);
  const score = scoreMatch ? Math.max(0, Math.min(100, Number(scoreMatch[1]))) : null;

  const confidenceMatch = /fiducia\s*[:\-–]?\s*(bassa|media|alta)/i.exec(markdown);
  const confidence = confidenceMatch ? confidenceMatch[1]!.toLowerCase() : null;

  const summaryText = find(map, "sintesi", "valutazione complessiva");
  const summary =
    summaryText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/[*_`#]/g, "")
      .slice(0, 400) || null;

  const questionsText = find(map, "domande");
  const questions: ParsedAnalysis["questions"] = [];
  const questionLines = questionsText.split("\n").map((l) => l.trim());
  for (let i = 0; i < questionLines.length; i++) {
    const line = questionLines[i]!;
    const match = /^(?:\d+[.)]|[-*•])\s+(.+)$/.exec(line);
    if (!match) continue;
    const text = match[1]!.replace(/\*\*/g, "").trim();
    if (text.length < 8) continue;
    // La riga successiva, se in corsivo, contiene il motivo della domanda.
    const next = questionLines[i + 1] ?? "";
    const rationale = /^[_*].*(perch|motivo)/i.test(next)
      ? next.replace(/^[_*]+|[_*]+$/g, "").replace(/^perch[ée]\s*:?\s*/i, "").trim()
      : "";
    questions.push({ text, rationale, priority: questions.length < 2 ? "alta" : "media" });
    if (questions.length >= 5) break;
  }

  return {
    summary,
    score,
    confidence,
    strengths: bullets(find(map, "punti di forza", "forza"), 5),
    risks: bullets(find(map, "criticita", "rischi"), 6),
    actions: bullets(find(map, "azioni", "raccomandate", "prossimi passi"), 5),
    questions,
  };
}
