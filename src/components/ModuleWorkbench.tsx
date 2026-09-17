"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import ManualBridge from "./ManualBridge";
import QuestionsPanel from "./QuestionsPanel";
import { ScoreBadge, StatusBadge } from "./Score";
import { consumeStream } from "@/lib/client/stream";
import type { Analysis, Question } from "@/lib/data/types";

type ModuleInfo = {
  id: string;
  name: string;
  icon: string;
  short: string;
  objective: string;
  web: boolean;
};

type Props = {
  projectId: string;
  module: ModuleInfo;
  analysis: Analysis | null;
  questions: (Question & { moduleName: string })[];
  answeredCount: number;
  /** Analisi automatica disponibile (chiave API configurata). */
  apiEnabled: boolean;
  /** Ponte manuale verso claude.ai disponibile. */
  manualEnabled: boolean;
};

export default function ModuleWorkbench({
  projectId,
  module,
  analysis,
  questions,
  answeredCount,
  apiEnabled,
  manualEnabled,
}: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [showFocus, setShowFocus] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [manualScore, setManualScore] = useState("");
  const [manualConfidence, setManualConfidence] = useState("media");
  const streamEnd = useRef<HTMLDivElement>(null);

  const current = analysis?.human_markdown?.trim() || analysis?.ai_markdown || "";
  const hasHumanVersion = Boolean(analysis?.human_markdown?.trim());

  useEffect(() => {
    if (running) streamEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [streamed, running]);

  async function run() {
    setRunning(true);
    setStreamed("");
    setStatuses([]);
    setSources([]);
    setError(null);

    await consumeStream(
      `/api/projects/${projectId}/analyze/${module.id}`,
      { focus: focus.trim() || undefined },
      (event) => {
        if (event.type === "text") setStreamed((prev) => prev + event.text);
        else if (event.type === "status" || event.type === "warning")
          setStatuses((prev) => [...prev, event.message]);
        else if (event.type === "source") setSources((prev) => [...prev, event.source]);
        else if (event.type === "error") setError(event.message);
        else if (event.type === "done") {
          setRunning(false);
          router.refresh();
        }
      },
    );
    setRunning(false);
    router.refresh();
  }

  async function saveScore() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/analyses/${module.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: Number(manualScore), confidence: manualConfidence }),
    });
    setSaving(false);
    router.refresh();
  }

  async function save(status: "in_revisione" | "validata") {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/analyses/${module.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: draft, status }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Salvataggio non riuscito.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="panel flex flex-wrap items-center gap-5 p-5">
        <ScoreBadge score={analysis?.score ?? null} size="lg" />
        <div className="min-w-64 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">
              <span aria-hidden>{module.icon}</span> {module.name}
            </h2>
            <StatusBadge status={analysis?.status ?? "assente"} />
            {analysis?.confidence ? (
              <span className="badge">fiducia {analysis.confidence}</span>
            ) : null}
            {module.web ? <span className="badge">ricerca web attiva</span> : null}
          </div>
          <p className="muted mt-1 text-sm">{analysis?.summary ?? module.objective}</p>
          {analysis && analysis.score === null ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="muted text-xs">
                Punteggio non rilevato nel testo: assegnalo tu.
              </span>
              <input
                className="input w-20"
                type="number"
                min={0}
                max={100}
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                placeholder="0-100"
              />
              <select
                className="select w-28"
                value={manualConfidence}
                onChange={(e) => setManualConfidence(e.target.value)}
              >
                <option value="bassa">fiducia bassa</option>
                <option value="media">fiducia media</option>
                <option value="alta">fiducia alta</option>
              </select>
              <button className="btn" onClick={saveScore} disabled={saving || manualScore === ""}>
                Salva
              </button>
            </div>
          ) : null}
          {analysis ? (
            <p className="muted mt-1 text-xs">
              Esecuzioni: {analysis.run_count} · Ultimo aggiornamento:{" "}
              {new Date(analysis.updated_at).toLocaleString("it-IT")}
              {analysis.validated_by ? ` · Validata da ${analysis.validated_by}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {apiEnabled ? (
            <button className="btn btn-primary" onClick={run} disabled={running}>
              {running ? "Analisi in corso…" : analysis ? "Rigenera analisi" : "Avvia analisi"}
            </button>
          ) : null}
          <button className="btn" onClick={() => setShowFocus((v) => !v)} disabled={running}>
            {showFocus ? "Nascondi focus" : "Dai un focus"}
          </button>
        </div>
      </div>

      {showFocus ? (
        <div className="panel p-4">
          <label className="label" htmlFor="focus">
            Su cosa vuoi che si concentri questa esecuzione
          </label>
          <textarea
            id="focus"
            className="textarea"
            rows={2}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Es. concentrati sul confronto con i due competitor italiani e sul prezzo"
          />
        </div>
      ) : null}

      {answeredCount > 0 && analysis ? (
        <div className="panel p-4 text-sm" style={{ borderColor: "var(--good)" }}>
          Hai risposto a {answeredCount} domande su questo progetto. Rigenera il modulo per far
          entrare le risposte nell&apos;analisi.
        </div>
      ) : null}

      {error ? (
        <div className="panel p-4 text-sm" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>
          {error}
        </div>
      ) : null}

      {running || streamed ? (
        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <span className="badge" style={{ color: "var(--good)", borderColor: "var(--good)" }}>
              {running ? "in scrittura" : "completata"}
            </span>
            {statuses.length ? <span className="muted text-xs">{statuses[statuses.length - 1]}</span> : null}
          </div>
          {sources.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="badge hover:underline"
                >
                  🔎 {source.title.slice(0, 48)}
                </a>
              ))}
            </div>
          ) : null}
          <div className="mt-4">
            <Markdown>{streamed || "…"}</Markdown>
          </div>
          <div ref={streamEnd} />
        </div>
      ) : null}

      {analysis && !running ? (
        <div className="panel p-5">
          <div className="no-print mb-4 flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => save("validata")}
                  disabled={saving || !draft.trim()}
                >
                  {saving ? "Salvataggio…" : "Salva e valida"}
                </button>
                <button className="btn" onClick={() => save("in_revisione")} disabled={saving}>
                  Salva come bozza
                </button>
                <button className="btn" onClick={() => setEditing(false)} disabled={saving}>
                  Annulla
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn"
                  onClick={() => {
                    setDraft(current);
                    setEditing(true);
                  }}
                >
                  ✎ Correggi e valida
                </button>
                {analysis.status !== "validata" ? (
                  <button
                    className="btn"
                    onClick={async () => {
                      setDraft(current);
                      setSaving(true);
                      await fetch(`/api/projects/${projectId}/analyses/${module.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ markdown: current, status: "validata" }),
                      });
                      setSaving(false);
                      router.refresh();
                    }}
                    disabled={saving}
                  >
                    ✓ Valida così com&apos;è
                  </button>
                ) : null}
                {hasHumanVersion ? (
                  <button className="btn" onClick={() => setShowOriginal((v) => !v)}>
                    {showOriginal ? "Torna alla tua versione" : "Vedi versione originale di Claude"}
                  </button>
                ) : null}
              </>
            )}
          </div>

          {editing ? (
            <textarea
              className="textarea font-mono"
              style={{ minHeight: "60vh" }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <Markdown>{showOriginal ? analysis.ai_markdown : current}</Markdown>
          )}

          {analysis.sources.length && !editing ? (
            <div className="mt-6 border-t pt-4">
              <p className="label">Fonti consultate</p>
              <ul className="space-y-1 text-sm">
                {analysis.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {manualEnabled ? (
        apiEnabled ? (
          <details className="panel p-5">
            <summary className="cursor-pointer font-semibold">
              Analisi senza chiamata API (prompt da portare su claude.ai)
            </summary>
            <div className="mt-4">
              <ManualBridge
                projectId={projectId}
                moduleId={module.id}
                moduleName={module.name}
                focus={focus}
              />
            </div>
          </details>
        ) : (
          <div className="panel p-5">
            <h3 className="font-semibold">Analisi guidata in due passaggi</h3>
            <div className="mt-3">
              <ManualBridge
                projectId={projectId}
                moduleId={module.id}
                moduleName={module.name}
                focus={focus}
                primary
              />
            </div>
          </div>
        )
      ) : null}

      <div className="panel p-5">
        <h3 className="font-semibold">Domande di questo modulo</h3>
        <p className="muted mt-1 mb-4 text-sm">
          È la parte dialogica: rispondi, poi rigenera il modulo per vedere come cambia la
          valutazione.
        </p>
        <QuestionsPanel projectId={projectId} questions={questions} />
      </div>
    </div>
  );
}
