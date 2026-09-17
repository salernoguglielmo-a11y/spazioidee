"use client";

import { useState } from "react";

type ContextInfo = {
  stats: { documents: number; chars: number; nativePdfs: number; answeredQuestions: number };
  warnings: string[];
  preview: string;
  previewTruncated: boolean;
};

export default function ContextInspector({ projectId }: { projectId: string }) {
  const [info, setInfo] = useState<ContextInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (info) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/context`);
    if (res.ok) {
      setInfo(await res.json());
      setOpen(true);
    }
    setLoading(false);
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Cosa riceve Claude</h3>
          <p className="muted mt-1 text-sm">
            Nessuna scatola nera: puoi vedere il contesto esatto che viene inviato al modello a ogni
            analisi.
          </p>
        </div>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "…" : open ? "Nascondi" : "Mostra contesto"}
        </button>
      </div>

      {open && info ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="badge">{info.stats.documents} documenti nel contesto</span>
            <span className="badge">{info.stats.chars.toLocaleString("it-IT")} caratteri</span>
            {info.stats.nativePdfs ? (
              <span className="badge">{info.stats.nativePdfs} PDF inviati come immagine</span>
            ) : null}
            <span className="badge">{info.stats.answeredQuestions} risposte incluse</span>
          </div>
          {info.warnings.map((warning) => (
            <p key={warning} className="text-sm" style={{ color: "var(--warn)" }}>
              ⚠ {warning}
            </p>
          ))}
          <pre
            className="muted max-h-96 overflow-auto rounded-xl p-3 text-xs whitespace-pre-wrap"
            style={{ background: "var(--panel-2)" }}
          >
            {info.preview}
            {info.previewTruncated ? "\n\n[… anteprima troncata …]" : ""}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
