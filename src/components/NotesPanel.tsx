"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Insight } from "@/lib/data/types";

export default function NotesPanel({
  projectId,
  insights,
}: {
  projectId: string;
  insights: Insight[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    setText("");
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/projects/${projectId}/insights?insightId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="muted text-sm">
        Informazioni che non stanno nei documenti: un contatto, un numero aggiornato, una decisione
        presa. Entrano nel contesto di ogni analisi successiva.
      </p>
      <div className="flex gap-2">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Es. il pilota con la clinica X parte a marzo, 2.000€"
        />
        <button className="btn btn-primary" onClick={add} disabled={busy || !text.trim()}>
          Aggiungi
        </button>
      </div>
      {insights.length ? (
        <ul className="space-y-2">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm"
              style={{ background: "var(--panel-2)" }}
            >
              <span>{insight.content}</span>
              <button
                className="muted shrink-0 text-xs hover:underline"
                onClick={() => remove(insight.id)}
              >
                rimuovi
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
