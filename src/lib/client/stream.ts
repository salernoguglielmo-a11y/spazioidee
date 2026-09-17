export type ServerEvent =
  | { type: "text"; text: string }
  | { type: "status"; message: string }
  | { type: "warning"; message: string }
  | { type: "source"; source: { title: string; url: string } }
  | { type: "done"; score: number | null; summary: string | null; questions: number }
  | { type: "error"; message: string };

/** Consuma una risposta SSE prodotta da sseResponse(). */
export async function consumeStream(
  url: string,
  body: unknown,
  onEvent: (event: ServerEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Errore ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // risposta non JSON: si usa il messaggio generico
    }
    onEvent({ type: "error", message });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as ServerEvent);
      } catch {
        // frammento non valido: ignorato
      }
    }
  }
}
