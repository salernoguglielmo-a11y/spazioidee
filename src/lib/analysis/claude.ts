import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { EXTRACTION_TOOL, EXTRACTION_TOOL_NAME } from "./prompts";

let cached: Anthropic | null = null;

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY non configurata: l'analisi con Claude non è disponibile. Aggiungi la chiave in .env.local e riavvia.",
    );
  }
}

export function claude(): Anthropic {
  if (!env.anthropicApiKey) throw new MissingApiKeyError();
  if (!cached) cached = new Anthropic({ apiKey: env.anthropicApiKey });
  return cached;
}

export type Source = { title: string; url: string };

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "status"; message: string }
  | { type: "source"; source: Source };

export type StreamResult = {
  text: string;
  sources: Source[];
  usage: { input: number; output: number; cacheRead: number };
};

export type StreamOptions = {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  webSearch?: boolean;
  maxTokens?: number;
  effort?: typeof env.effort;
  onEvent: (event: StreamEvent) => void;
};

const MAX_PAUSE_RESUMES = 4;

/**
 * Un turno dell'assistente in streaming, con gestione di `pause_turn`
 * (la ricerca web può sospendere il turno: va ripreso rimettendo in coda
 * il contenuto già prodotto, altrimenti la risposta resta troncata).
 */
export async function streamAssistant(options: StreamOptions): Promise<StreamResult> {
  const client = claude();
  const messages = [...options.messages];
  const sources: Source[] = [];
  const seen = new Set<string>();
  const usage = { input: 0, output: 0, cacheRead: 0 };
  let text = "";

  const tools: Anthropic.ToolUnion[] =
    options.webSearch && env.enableWebSearch
      ? [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: env.webSearchMaxUses,
          },
        ]
      : [];

  for (let attempt = 0; attempt <= MAX_PAUSE_RESUMES; attempt++) {
    const stream = client.messages.stream({
      model: env.model,
      max_tokens: options.maxTokens ?? 32000,
      system: options.system,
      messages,
      ...(tools.length ? { tools } : {}),
      output_config: { effort: options.effort ?? env.effort },
    });

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
        options.onEvent({ type: "status", message: "Ricerca web in corso…" });
      }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        options.onEvent({ type: "text", text: event.delta.text });
      }
    }

    const final = await stream.finalMessage();
    usage.input += final.usage.input_tokens ?? 0;
    usage.output += final.usage.output_tokens ?? 0;
    usage.cacheRead += final.usage.cache_read_input_tokens ?? 0;

    for (const block of final.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.type === "web_search_result" && !seen.has(item.url)) {
            seen.add(item.url);
            const source = { title: item.title || item.url, url: item.url };
            sources.push(source);
            options.onEvent({ type: "source", source });
          }
        }
      }
    }

    if (final.stop_reason === "refusal") {
      throw new Error(
        "Il modello ha interrotto la risposta per motivi di sicurezza. Riformula la richiesta o segnala il caso.",
      );
    }
    if (final.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: final.content });
      options.onEvent({ type: "status", message: "Elaborazione dei risultati di ricerca…" });
      continue;
    }
    if (final.stop_reason === "max_tokens") {
      options.onEvent({
        type: "status",
        message: "Risposta interrotta per limite di lunghezza: il testo potrebbe essere incompleto.",
      });
    }
    break;
  }

  return { text, sources, usage };
}

export type StructuredSummary = {
  summary: string;
  score: number;
  confidence: string;
  strengths: string[];
  risks: string[];
  actions: string[];
  questions: { text: string; rationale: string; priority: string }[];
  sources: Source[];
};

/**
 * Seconda passata, non in streaming: trasforma l'analisi testuale in dati
 * strutturati (punteggio, elenchi, domande) usando un tool con schema stretto.
 */
export async function extractSummary(
  moduleName: string,
  analysisMarkdown: string,
): Promise<StructuredSummary | null> {
  const client = claude();
  try {
    const response = await client.messages.create({
      model: env.model,
      max_tokens: 4000,
      output_config: { effort: "low" },
      tools: [EXTRACTION_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: `Ecco l'analisi del modulo "${moduleName}" appena prodotta. Estraine la sintesi strutturata, restando fedele al testo: non aggiungere valutazioni che non ci sono e riporta le domande così come sono formulate.\n\n<analisi>\n${analysisMarkdown}\n</analisi>`,
        },
      ],
    });

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME) {
        return block.input as StructuredSummary;
      }
    }
    return null;
  } catch (error) {
    console.error("Estrazione sintesi non riuscita:", error);
    return null;
  }
}
