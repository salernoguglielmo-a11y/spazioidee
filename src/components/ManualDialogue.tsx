"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Dialogo senza chiave API: si porta il contesto del progetto su claude.ai e
 * si riportano qui le conclusioni utili, che restano nel contesto del progetto.
 */
export default function ManualDialogue({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copyContext() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/prompt`);
      const data = await res.json();
      if (!res.ok) return;
      setPrompt(data.prompt);
      try {
        await navigator.clipboard.writeText(data.prompt);
        setCopied(`Contesto copiato (${Math.round(data.chars / 1000)} mila caratteri).`);
      } catch {
        setCopied("Copia automatica non disponibile: seleziona il testo nel riquadro qui sotto.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (!note.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note.trim() }),
    });
    setNote("");
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="panel space-y-5 p-5">
      <p className="muted text-sm">
        Senza chiave API il dialogo si tiene direttamente su claude.ai: copi il contesto del
        progetto, apri una conversazione e discuti quanto vuoi. Quello che emerge di utile lo
        riporti qui sotto, così rientra nel contesto delle analisi successive.
      </p>

      <div>
        <p className="label">1. Porta il progetto nella conversazione</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={copyContext} disabled={busy}>
            Copia il contesto del progetto
          </button>
          <a className="btn" href="https://claude.ai/new" target="_blank" rel="noreferrer">
            Apri claude.ai ↗
          </a>
        </div>
        {copied ? <p className="muted mt-2 text-xs">{copied}</p> : null}
        {prompt ? (
          <details className="mt-3">
            <summary className="muted cursor-pointer text-xs">Mostra il testo</summary>
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
        <p className="label">2. Riporta qui quello che conta</p>
        <textarea
          className="textarea"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Es. Claude ha fatto notare che il CAC stimato non include il tempo dei fondatori; ricalcolarlo."
        />
        <div className="mt-2 flex items-center gap-3">
          <button className="btn btn-primary" onClick={saveNote} disabled={busy || !note.trim()}>
            Aggiungi al progetto
          </button>
          {saved ? <span className="muted text-sm">Salvato fra le note del progetto.</span> : null}
        </div>
      </div>
    </div>
  );
}
