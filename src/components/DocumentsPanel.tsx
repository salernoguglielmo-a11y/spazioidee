"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DOC_KINDS, type DocumentRecord } from "@/lib/data/types";

type Props = {
  projectId: string;
  documents: (DocumentRecord & { preview?: string })[];
  maxMb: number;
};

export default function DocumentsPanel({ projectId, documents, maxMb }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<string>("business plan");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<{ filename: string; status: string; warning: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setResults([]);

    const body = new FormData();
    body.append("kind", kind);
    for (const file of Array.from(files)) body.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Caricamento non riuscito.");
      else setResults(data.results ?? []);
      router.refresh();
    } catch {
      setError("Errore di rete durante il caricamento.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(docId: string) {
    if (!confirm("Eliminare questo documento? L'analisi già prodotta resta, ma il testo non sarà più nel contesto.")) return;
    await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" });
    router.refresh();
  }

  async function changeKind(docId: string, value: string) {
    await fetch(`/api/projects/${projectId}/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: value }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="label" htmlFor="kind">
              Tipo di documento
            </label>
            <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <p className="muted flex-1 text-xs">
            Formati letti: PDF, DOCX, XLSX/XLS, CSV, TXT, MD. Massimo {maxMb} MB per file. I PDF
            senza testo selezionabile vengono inviati a Claude come immagine quando possibile.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="mt-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition"
          style={{
            borderColor: dragging ? "var(--good)" : "var(--border)",
            background: dragging ? "var(--panel-2)" : "transparent",
          }}
        >
          <p className="font-medium">
            {uploading ? "Lettura dei documenti in corso…" : "Trascina qui i file o fai clic per sceglierli"}
          </p>
          <p className="muted mt-1 text-xs">Puoi caricare più file insieme.</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
            onChange={(e) => upload(e.target.files)}
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        ) : null}

        {results.length ? (
          <ul className="mt-3 space-y-1 text-sm">
            {results.map((r) => (
              <li key={r.filename}>
                <span style={{ color: r.status === "ok" ? "var(--ok)" : "var(--warn)" }}>
                  {r.status === "ok" ? "✓" : "⚠"}
                </span>{" "}
                {r.filename}
                {r.warning ? <span className="muted"> — {r.warning}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {documents.length ? (
        <div className="panel divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{doc.filename}</span>
                  <span className="badge">{(doc.size / 1024).toFixed(0)} KB</span>
                  {doc.status === "ok" ? (
                    <span className="badge" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>
                      {doc.chars.toLocaleString("it-IT")} caratteri letti
                    </span>
                  ) : (
                    <span className="badge" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>
                      {doc.status}
                    </span>
                  )}
                </div>
                {doc.warning ? <p className="muted mt-1 text-xs">{doc.warning}</p> : null}
                {doc.preview ? (
                  <p className="muted mt-2 line-clamp-2 text-xs italic">{doc.preview}…</p>
                ) : null}
              </div>
              <select
                className="select w-44"
                value={doc.kind}
                onChange={(e) => changeKind(doc.id, e.target.value)}
              >
                {DOC_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={() => remove(doc.id)}>
                Elimina
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
