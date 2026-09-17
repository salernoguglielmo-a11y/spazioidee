import { listAnalyses, listInsights, listQuestions } from "../data/analyses";
import { listDocuments } from "../data/documents";
import { getModule, modulesFor } from "./modules";
import { computeReadiness } from "./scoring";
import type { Project } from "../data/types";

function dateIt(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Dossier consolidato: la versione umana prevale su quella generata. */
export async function buildDossier(project: Project): Promise<string> {
  const [analyses, questions, insights, documents] = await Promise.all([
    listAnalyses(project.id),
    listQuestions(project.id),
    listInsights(project.id),
    listDocuments(project.id),
  ]);

  const readiness = computeReadiness(project.modules, analyses, questions);
  const byModule = new Map(analyses.map((a) => [a.module_id, a]));
  const modules = modulesFor(project.modules);

  const out: string[] = [];
  out.push(`# Dossier di analisi — ${project.name}`);
  out.push(
    [
      project.one_liner ? `**${project.one_liner}**` : null,
      `Generato il ${dateIt(new Date().toISOString())} · Spazio Idee`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  const meta = [
    ["Settore", project.sector],
    ["Fase", project.stage],
    ["Mercato", project.geography],
    ["Modello di business", project.business_model],
    ["Obiettivo dell'analisi", project.goal],
  ].filter(([, v]) => v) as [string, string][];
  if (meta.length) {
    out.push(`## Scheda progetto\n${meta.map(([k, v]) => `- **${k}**: ${v}`).join("\n")}`);
  }

  out.push(
    `## Valutazione complessiva\n` +
      `- **Indice di solidità**: ${readiness.score ?? "n.d."}/100 — ${readiness.label}\n` +
      `- **Moduli analizzati**: ${readiness.analyzed}/${readiness.total} (validati dall'umano: ${readiness.validated})\n` +
      `- **Domande aperte**: ${readiness.openQuestions}\n\n${readiness.description}`,
  );

  const rows = modules.map((module) => {
    const analysis = byModule.get(module.id);
    const status = !analysis
      ? "non analizzato"
      : analysis.status === "validata"
        ? "validata"
        : analysis.status === "in_revisione"
          ? "in revisione"
          : "generata";
    return `| ${module.name} | ${analysis?.score ?? "—"} | ${analysis?.confidence ?? "—"} | ${status} |`;
  });
  out.push(
    `## Quadro dei moduli\n\n| Modulo | Punteggio | Fiducia | Stato |\n|---|---|---|---|\n${rows.join("\n")}`,
  );

  if (documents.length) {
    out.push(
      `## Documentazione analizzata\n${documents
        .map(
          (d) =>
            `- ${d.filename} (${d.kind}, ${(d.size / 1024).toFixed(0)} KB)${
              d.status !== "ok" ? ` — ⚠️ ${d.warning ?? "non leggibile"}` : ""
            }`,
        )
        .join("\n")}`,
    );
  }

  for (const module of modules) {
    const analysis = byModule.get(module.id);
    if (!analysis) continue;
    const text = analysis.human_markdown?.trim() || analysis.ai_markdown;
    const origin =
      analysis.status === "validata"
        ? `Validata da ${analysis.validated_by ?? "umano"} il ${dateIt(analysis.validated_at ?? analysis.updated_at)}`
        : analysis.human_markdown
          ? "Revisione umana in corso"
          : "Generata da Claude, non ancora validata";
    out.push(`---\n\n# ${module.icon} ${module.name}\n\n_${origin}_\n\n${text}`);
    if (analysis.sources.length) {
      out.push(
        `**Fonti consultate**\n${analysis.sources.map((s) => `- [${s.title}](${s.url})`).join("\n")}`,
      );
    }
  }

  const answered = questions.filter((q) => q.status === "risposta");
  if (answered.length) {
    out.push(
      `---\n\n## Registro delle risposte\n${answered
        .map((q) => {
          const module = getModule(q.module_id);
          return `**[${module?.name ?? q.module_id}] ${q.text}**\n\n${q.answer}\n\n_Risposta di ${q.answered_by ?? "—"}${
            q.answered_at ? ` il ${dateIt(q.answered_at)}` : ""
          }_`;
        })
        .join("\n\n")}`,
    );
  }

  const open = questions.filter((q) => q.status === "aperta");
  if (open.length) {
    out.push(
      `## Domande ancora aperte\n${open
        .map((q) => `- [${getModule(q.module_id)?.name ?? q.module_id}] ${q.text}`)
        .join("\n")}`,
    );
  }

  if (insights.length) {
    out.push(`## Note aggiunte\n${insights.map((i) => `- ${i.content}`).join("\n")}`);
  }

  out.push(
    `---\n\n_Questo dossier nasce da un'analisi congiunta: Claude produce la prima lettura applicando le best practice di settore, la persona che segue il progetto verifica, corregge e valida. Le parti non validate vanno considerate ipotesi di lavoro. Il documento non costituisce consulenza legale, fiscale o finanziaria._`,
  );

  return out.join("\n\n");
}
