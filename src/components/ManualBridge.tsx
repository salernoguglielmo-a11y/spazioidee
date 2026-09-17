"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  projectId: string;
  moduleId: string;
  moduleName: string;
  focus?: string;
  /** true quando è l'unico modo disponibile (nessuna chiave API configurata). */
  primary?: boolean;
};

type Parsed = {
  score: number | null;
  confidence: string | null;
  questions: number;
  strengths: number;
  risks: number;
  actions: number;
};

export default function ManualBridge({ projectId, moduleId, moduleName, focus, primary }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyPrompt(mode: "completo" | "istruzioni") {
    setError(null);
    setBusy(true);
    try {
      const params = new URLSearchParams({ mode });
      if (focus?.trim()) params.set("focus", focus.trim());
      const res = await fetch(`/api/projects/${projectId}/prompt/${moduleId}?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Preparazione del prompt non riuscita.");
        return;
      }
      setPrompt(data.prompt);
      try {
        await navigator.clipboard.writeText(data.prompt);
        setCopied(
          `Prompt copiato (${Math.round(data.chars / 1000)} mila caratteri). Incollalo su claude.ai.`,
        );
      } catch {
        setCopied("Copia automatica non disponibile: usa il riquadro qui sotto per selezionare il testo.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    setParsed(null);
    const res = await fetch(`/api/projects/${projectId}/analyses/${moduleId}/manuale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: answer }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Salvataggio non riuscito.");
      return;
    }
    setParsed(data.parsed);
    setAnswer("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {primary ? (
        <p className="muted text-sm">
          Nessuna chiave API configurata: l&apos;analisi si fa in due passaggi, senza costi
          aggiuntivi. L&apos;applicazione prepara il prompt con documenti, contesto e griglia di
          best practice; tu lo incolli nel tuo Claude e riporti qui la risposta. Punteggi, domande,
          validazione e dossier funzionano esattamente come nella modalità automatica.
        </p>
      ) : null}

      <div>
        <p className="label">1. Prendi il prompt di «{moduleName}»</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => copyPrompt("completo")} disabled={busy}>
            Copia prompt con i documenti
          </button>
          <button className="btn" onClick={() => copyPrompt("istruzioni")} disabled={busy}>
            Copia solo istruzioni (allego io i file)
          </button>
          <a className="btn" href="https://claude.ai/new" target="_blank" rel="noreferrer">
            Apri claude.ai ↗
          </a>
        </div>
        {copied ? (
          <p className="muted mt-2 text-xs">{copied}</p>
        ) : (
          <p className="muted mt-2 text-xs">
            Se i documenti sono lunghi, usa il secondo pulsante e allega i file direttamente nella
            conversazione: Claude li legge dagli allegati.
          </p>
        )}
        {prompt ? (
          <details className="mt-3">
            <summary className="muted cursor-pointer text-xs">Mostra il prompt</summary>
            <textarea
              className="textarea mt-2 font-mono text-xs"
              rows={10}
              readOnly
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
            />
          </details>
        ) : null}
      </div>

      <div>
        <p className="label">2. Incolla qui la risposta</p>
        <textarea
          className="textarea"
          rows={8}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Incolla il testo completo prodotto da Claude, comprese le righe PUNTEGGIO e FIDUCIA finali."
        />
        <button
          className="btn btn-primary mt-2"
          onClick={save}
          disabled={busy || answer.trim().length < 80}
        >
          {busy ? "Salvataggio…" : "Salva come analisi del modulo"}
        </button>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      {parsed ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--ok)" }}>
          <p className="font-semibold">Analisi registrata.</p>
          <p className="muted mt-1">
            Punteggio: {parsed.score ?? "non trovato"} · fiducia: {parsed.confidence ?? "non indicata"} ·
            domande: {parsed.questions} · punti di forza: {parsed.strengths} · criticità: {parsed.risks} ·
            azioni: {parsed.actions}
          </p>
          {parsed.score === null ? (
            <p className="mt-1 text-xs" style={{ color: "var(--warn)" }}>
              Il punteggio non è stato trovato nel testo: puoi chiedere a Claude di aggiungere la riga
              «PUNTEGGIO: nn» e reincollare, oppure lasciare così e valutare tu il modulo.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
