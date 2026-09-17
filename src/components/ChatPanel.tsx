"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { consumeStream } from "@/lib/client/stream";
import type { ChatMessage } from "@/lib/data/types";

const SUGGESTIONS = [
  "Qual è il punto più debole del progetto in questo momento?",
  "Fammi le tre domande che mi farebbe un investitore seed la prima volta.",
  "Il dimensionamento di mercato che ho scritto regge? Ricalcolalo bottom-up.",
  "Cosa devo dimostrare nei prossimi 90 giorni per alzare il punteggio?",
];

export default function ChatPanel({
  projectId,
  initialMessages,
}: {
  projectId: string;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setStreaming("");
    setSources([]);
    setStatus(null);
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        project_id: projectId,
        module_id: null,
        role: "user",
        content: message,
        author: null,
        created_at: new Date().toISOString(),
      },
    ]);

    let full = "";
    await consumeStream(`/api/projects/${projectId}/chat`, { message }, (event) => {
      if (event.type === "text") {
        full += event.text;
        setStreaming(full);
      } else if (event.type === "status" || event.type === "warning") setStatus(event.message);
      else if (event.type === "source") setSources((prev) => [...prev, event.source]);
      else if (event.type === "error") setError(event.message);
    });

    if (full.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-a-${Date.now()}`,
          project_id: projectId,
          module_id: null,
          role: "assistant",
          content: full,
          author: null,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setStreaming("");
    setBusy(false);
    router.refresh();
  }

  async function clearAll() {
    if (!confirm("Cancellare tutta la conversazione? Le analisi e le risposte alle domande restano.")) return;
    await fetch(`/api/projects/${projectId}/chat`, { method: "DELETE" });
    setMessages([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="panel flex min-h-[55vh] flex-col p-5">
        <div className="flex-1 space-y-4">
          {messages.length === 0 && !streaming ? (
            <div className="muted py-10 text-center text-sm">
              <p>
                Qui puoi discutere il progetto con Claude: conosce i documenti caricati, le analisi
                prodotte e le risposte che hai già dato.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} className="btn" onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-xl p-4"
              style={{
                background: message.role === "user" ? "var(--accent-soft)" : "var(--panel-2)",
              }}
            >
              <p className="label mb-1">{message.role === "user" ? "Tu" : "Claude"}</p>
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              ) : (
                <Markdown>{message.content}</Markdown>
              )}
            </div>
          ))}

          {streaming ? (
            <div className="rounded-xl p-4" style={{ background: "var(--panel-2)" }}>
              <p className="label mb-1">Claude</p>
              <Markdown>{streaming}</Markdown>
            </div>
          ) : null}

          {busy && !streaming ? <p className="muted text-sm">{status ?? "Sto leggendo il dossier…"}</p> : null}
          {sources.length ? (
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="badge">
                  🔎 {source.title.slice(0, 40)}
                </a>
              ))}
            </div>
          ) : null}
          <div ref={bottom} />
        </div>

        {error ? (
          <p className="mt-3 text-sm" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-end gap-2 border-t pt-4">
          <textarea
            className="textarea"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(input);
            }}
            placeholder="Scrivi qui… (Ctrl+Invio per inviare)"
            disabled={busy}
          />
          <button className="btn btn-primary" onClick={() => send(input)} disabled={busy || !input.trim()}>
            {busy ? "…" : "Invia"}
          </button>
        </div>
      </div>

      {messages.length ? (
        <button className="btn" onClick={clearAll}>
          Cancella conversazione
        </button>
      ) : null}
    </div>
  );
}
