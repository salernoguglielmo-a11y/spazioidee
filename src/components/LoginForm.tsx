"use client";

import { useState } from "react";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    setError(null);
    setMessage(null);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Richiesta non riuscita.");
        setState("idle");
        return;
      }
      setMessage(data.message ?? "Controlla la tua casella di posta.");
      setDevUrl(data.devUrl ?? null);
      setState("sent");
    } catch {
      setError("Errore di rete. Riprova.");
      setState("idle");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Indirizzo email autorizzato
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          placeholder="nome@dominio.it"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "loading"}
        />
      </div>

      <button className="btn btn-primary w-full justify-center" disabled={state === "loading"}>
        {state === "loading" ? "Invio in corso…" : "Ricevi il link di accesso"}
      </button>

      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      {message ? (
        <div className="rounded-xl p-3 text-sm" style={{ background: "var(--panel-2)" }}>
          <p>{message}</p>
          {devUrl ? (
            <a className="mt-2 inline-block break-all underline" href={devUrl}>
              {devUrl}
            </a>
          ) : null}
        </div>
      ) : null}

      <p className="muted text-xs">
        L&apos;accesso è riservato agli indirizzi email inseriti in allowlist. Nessuna registrazione,
        nessuna password: ricevi un link valido 15 minuti, utilizzabile una sola volta.
      </p>
    </form>
  );
}
