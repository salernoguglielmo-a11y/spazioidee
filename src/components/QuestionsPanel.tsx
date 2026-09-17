"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Question } from "@/lib/data/types";

type Props = {
  projectId: string;
  questions: (Question & { moduleName: string })[];
  compact?: boolean;
};

const PRIORITY_COLOR: Record<string, string> = {
  alta: "var(--bad)",
  media: "var(--warn)",
  bassa: "var(--muted)",
};

export default function QuestionsPanel({ projectId, questions, compact }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(questionId: string, payload: Record<string, unknown>) {
    setBusy(questionId);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/questions/${questionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Operazione non riuscita.");
      return;
    }
    setDrafts((prev) => ({ ...prev, [questionId]: "" }));
    router.refresh();
  }

  if (!questions.length) {
    return (
      <p className="muted text-sm">
        Nessuna domanda aperta. Le domande compaiono qui dopo ogni analisi: sono il punto in cui il
        tuo contributo cambia davvero il risultato.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}
      {questions.map((question) => (
        <div key={question.id} className="rounded-xl border p-4" style={{ background: "var(--panel-2)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{question.moduleName}</span>
            <span
              className="badge"
              style={{
                color: PRIORITY_COLOR[question.priority] ?? "var(--muted)",
                borderColor: PRIORITY_COLOR[question.priority] ?? "var(--border)",
              }}
            >
              priorità {question.priority}
            </span>
          </div>
          <p className="mt-2 font-medium">{question.text}</p>
          {question.rationale && !compact ? (
            <p className="muted mt-1 text-xs italic">Perché: {question.rationale}</p>
          ) : null}
          <textarea
            className="textarea mt-3"
            rows={compact ? 2 : 3}
            placeholder="La tua risposta: più è concreta, più l'analisi successiva sarà utile."
            value={drafts[question.id] ?? ""}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [question.id]: e.target.value }))}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="btn btn-primary"
              disabled={busy === question.id || !(drafts[question.id] ?? "").trim()}
              onClick={() => send(question.id, { answer: drafts[question.id] })}
            >
              {busy === question.id ? "Salvataggio…" : "Salva risposta"}
            </button>
            <button
              className="btn"
              disabled={busy === question.id}
              onClick={() => send(question.id, { action: "archivia" })}
            >
              Non pertinente
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
