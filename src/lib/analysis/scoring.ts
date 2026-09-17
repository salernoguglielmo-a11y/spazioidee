import { MODULES, modulesFor } from "./modules";
import type { Analysis, Question } from "../data/types";

export type Readiness = {
  score: number | null;
  label: string;
  description: string;
  coverage: number;
  analyzed: number;
  validated: number;
  total: number;
  openQuestions: number;
};

const LEVELS: { min: number; label: string; description: string }[] = [
  {
    min: 85,
    label: "Pronto al confronto con investitori",
    description:
      "Il dossier regge una due diligence iniziale. Concentrati sulla qualità della narrazione e sui materiali di supporto.",
  },
  {
    min: 70,
    label: "Solido con lacune da chiudere",
    description:
      "L'impianto tiene. Chiudi le criticità aperte prima di esporti a una valutazione esterna.",
  },
  {
    min: 50,
    label: "In costruzione",
    description:
      "Le basi ci sono ma mancano evidenze decisive. Priorità alle azioni sui moduli con punteggio più basso.",
  },
  {
    min: 0,
    label: "Da validare",
    description:
      "Il progetto è ancora in fase di ipotesi. Serve validazione sul campo prima di investire tempo sui documenti.",
  },
];

export function computeReadiness(
  enabledModuleIds: string[],
  analyses: Analysis[],
  questions: Question[],
): Readiness {
  const modules = modulesFor(enabledModuleIds.length ? enabledModuleIds : MODULES.map((m) => m.id));
  const byModule = new Map(analyses.map((a) => [a.module_id, a]));

  let weighted = 0;
  let weight = 0;
  let analyzed = 0;
  let validated = 0;

  for (const module of modules) {
    const analysis = byModule.get(module.id);
    if (!analysis) continue;
    analyzed += 1;
    if (analysis.status === "validata") validated += 1;
    if (typeof analysis.score === "number") {
      // Un'analisi validata dall'umano pesa di più: è stata verificata.
      const factor = analysis.status === "validata" ? module.weight * 1.25 : module.weight;
      weighted += analysis.score * factor;
      weight += factor;
    }
  }

  const score = weight > 0 ? Math.round(weighted / weight) : null;
  const level = LEVELS.find((l) => (score ?? -1) >= l.min) ?? LEVELS[LEVELS.length - 1]!;

  return {
    score,
    label: score === null ? "Nessuna analisi" : level.label,
    description:
      score === null
        ? "Carica i documenti e avvia il primo modulo per ottenere una valutazione."
        : level.description,
    coverage: modules.length ? Math.round((analyzed / modules.length) * 100) : 0,
    analyzed,
    validated,
    total: modules.length,
    openQuestions: questions.filter((q) => q.status === "aperta").length,
  };
}

export function scoreColor(score: number | null): string {
  if (score === null) return "var(--muted)";
  if (score >= 85) return "var(--ok)";
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--bad)";
}
