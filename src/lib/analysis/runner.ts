import type Anthropic from "@anthropic-ai/sdk";
import { buildProjectContext } from "./context";
import { extractSummary, streamAssistant, type Source, type StreamEvent } from "./claude";
import { CHAT_SYSTEM_SUFFIX, SYSTEM_METHOD, moduleUserPrompt } from "./prompts";
import type { AnalysisModule } from "./modules";
import { addMessage, replaceModuleQuestions, saveAiAnalysis } from "../data/analyses";
import { touchProject } from "../data/projects";
import type { ChatMessage, Project } from "../data/types";

export type RunnerEvent =
  | StreamEvent
  | { type: "warning"; message: string }
  | { type: "done"; score: number | null; summary: string | null; questions: number }
  | { type: "error"; message: string };

export type Emit = (event: RunnerEvent) => void;

function systemBlocks(extra?: string): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text",
      text: extra ? `${SYSTEM_METHOD}\n\n${extra}` : SYSTEM_METHOD,
      cache_control: { type: "ephemeral" },
    },
  ];
}

/** Esegue un modulo di analisi e persiste esito, punteggio e domande. */
export async function runModule(
  project: Project,
  module: AnalysisModule,
  options: { focus?: string; isRerun?: boolean },
  emit: Emit,
): Promise<void> {
  const context = await buildProjectContext(project);
  for (const warning of context.warnings) emit({ type: "warning", message: warning });

  emit({
    type: "status",
    message: `Analisi "${module.name}" su ${context.stats.documents} documenti${
      context.stats.answeredQuestions ? ` e ${context.stats.answeredQuestions} risposte` : ""
    }.`,
  });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        ...context.blocks,
        { type: "text", text: moduleUserPrompt(module, options) },
      ] as Anthropic.ContentBlockParam[],
    },
  ];

  const result = await streamAssistant({
    system: systemBlocks(),
    messages,
    webSearch: module.web,
    onEvent: emit,
  });

  if (!result.text.trim()) {
    emit({ type: "error", message: "Il modello non ha prodotto testo. Riprova." });
    return;
  }

  const structured = await extractSummary(module.name, result.text);
  const sources: Source[] = dedupeSources([...(structured?.sources ?? []), ...result.sources]);

  await saveAiAnalysis(project.id, module.id, {
    ai_markdown: result.text,
    summary: structured?.summary ?? null,
    score: typeof structured?.score === "number" ? clampScore(structured.score) : null,
    confidence: structured?.confidence ?? null,
    strengths: structured?.strengths ?? [],
    risks: structured?.risks ?? [],
    actions: structured?.actions ?? [],
    sources,
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
  });

  const questions = structured?.questions ?? [];
  if (questions.length) {
    await replaceModuleQuestions(project.id, module.id, questions);
  }
  await touchProject(project.id);

  emit({
    type: "done",
    score: structured ? clampScore(structured.score) : null,
    summary: structured?.summary ?? null,
    questions: questions.length,
  });
}

/** Un turno di dialogo sul progetto: il contesto è lo stesso dei moduli. */
export async function runChatTurn(
  project: Project,
  history: ChatMessage[],
  userMessage: string,
  author: string,
  emit: Emit,
): Promise<void> {
  const context = await buildProjectContext(project);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        ...context.blocks,
        {
          type: "text",
          text: "Questo è il contesto completo del progetto. Da qui in avanti parli direttamente con l'imprenditore.",
        },
      ] as Anthropic.ContentBlockParam[],
    },
    {
      role: "assistant",
      content:
        "Ho letto la documentazione e le analisi disponibili. Sono pronto: chiedimi pure quello che ti serve.",
    },
    ...history.map<Anthropic.MessageParam>((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  await addMessage(project.id, "user", userMessage, author);

  const result = await streamAssistant({
    system: systemBlocks(CHAT_SYSTEM_SUFFIX),
    messages,
    webSearch: true,
    maxTokens: 16000,
    onEvent: emit,
  });

  if (result.text.trim()) {
    await addMessage(project.id, "assistant", result.text, null);
  }
  await touchProject(project.id);
  emit({ type: "done", score: null, summary: null, questions: 0 });
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const source of sources) {
    if (!source?.url || seen.has(source.url)) continue;
    seen.add(source.url);
    out.push({ title: source.title || source.url, url: source.url });
  }
  return out;
}
