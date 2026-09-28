import { headers } from "next/headers";
import { access, constants, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, queryOne } from "./db";
import { apiEnabled, env, manualEnabled } from "./env";
import { estimateCost, formatCost, formatTokens } from "./analysis/cost";

export type Check = {
  name: string;
  state: "ok" | "attenzione" | "errore";
  detail: string;
  hint?: string;
};

/** Controlli di stato pensati per il dopo-deploy: dicono cosa manca e perché. */
export async function runDiagnostics(): Promise<Check[]> {
  const checks: Check[] = [];

  // Database
  const remote = env.databaseUrl.startsWith("libsql://") || env.databaseUrl.startsWith("https://");
  try {
    const client = await db();
    await client.execute("SELECT 1");
    const projects = await queryOne<{ n: number }>("SELECT COUNT(*) as n FROM projects");
    const documents = await queryOne<{ n: number }>("SELECT COUNT(*) as n FROM documents");
    checks.push({
      name: "Database",
      state: "ok",
      detail: `${remote ? "Turso/libsql remoto" : "SQLite locale"} raggiungibile · ${
        projects?.n ?? 0
      } progetti, ${documents?.n ?? 0} documenti`,
      hint:
        remote || process.env.VERCEL === undefined
          ? undefined
          : "Su un hosting serverless un file locale viene perso a ogni deploy: usa un database Turso.",
    });
  } catch (error) {
    checks.push({
      name: "Database",
      state: "errore",
      detail: String(error).slice(0, 200),
      hint: "Controlla DATABASE_URL e DATABASE_AUTH_TOKEN.",
    });
  }

  // Sessioni
  checks.push(
    env.authSecret
      ? {
          name: "Chiave di firma delle sessioni",
          state: env.authSecret.length >= 32 ? "ok" : "attenzione",
          detail:
            env.authSecret.length >= 32
              ? "Configurata"
              : "Configurata ma corta: usane una da almeno 32 caratteri",
        }
      : {
          name: "Chiave di firma delle sessioni",
          state: "errore",
          detail: "AUTH_SECRET non impostata: l'accesso non funziona",
          hint: "Genera con: openssl rand -base64 48",
        },
  );

  // Indirizzo pubblico
  const host = (await headers()).get("host") ?? "";
  const configured = env.appUrl.replace(/^https?:\/\//, "");
  checks.push(
    !host || host === configured
      ? { name: "Indirizzo pubblico", state: "ok", detail: env.appUrl }
      : {
          name: "Indirizzo pubblico",
          state: "attenzione",
          detail: `APP_URL è "${env.appUrl}" ma stai usando "${host}"`,
          hint: "I link di accesso puntano ad APP_URL: allinealo al dominio reale e rilancia il deploy.",
        },
  );

  // Modalità di analisi
  checks.push({
    name: "Analisi",
    state: "ok",
    detail: apiEnabled()
      ? `Automatica · modello ${env.model} · effort ${env.effort} · ricerca web ${
          env.enableWebSearch ? "attiva" : "disattivata"
        }`
      : "Manuale: l'applicazione prepara i prompt, tu li porti su claude.ai",
    hint:
      apiEnabled() || !manualEnabled()
        ? undefined
        : "Per l'analisi automatica aggiungi ANTHROPIC_API_KEY e rilancia il deploy.",
  });

  // Separazione dei progetti
  const modo = env.projectVisibility;
  checks.push({
    name: "Separazione dei progetti",
    state: "ok",
    detail:
      modo === "membri"
        ? "Elenco visibile a tutti gli autorizzati, dettagli ai soli membri del progetto"
        : modo === "private"
          ? "Ogni persona vede soltanto i progetti di cui fa parte"
          : "Modalità condivisa: ogni persona autorizzata vede tutti i progetti per intero",
    hint:
      modo === "shared"
        ? "Per separare i progetti fra più persone imposta PROJECT_VISIBILITY su «membri»."
        : "Gli amministratori dello spazio vedono comunque tutti i progetti.",
  });

  // Consumo API accumulato
  if (apiEnabled()) {
    const totals = await queryOne<{
      input_tokens: number;
      output_tokens: number;
      cache_tokens: number;
      runs: number;
    }>(
      `SELECT COALESCE(SUM(input_tokens),0) as input_tokens,
              COALESCE(SUM(output_tokens),0) as output_tokens,
              COALESCE(SUM(cache_tokens),0) as cache_tokens,
              COALESCE(SUM(run_count),0) as runs
       FROM analyses`,
    ).catch(() => null);

    if (totals) {
      const cost = estimateCost(totals);
      checks.push({
        name: "Consumo API stimato",
        state: "ok",
        detail: `${formatCost(cost)} su ${totals.runs} ${
          totals.runs === 1 ? "esecuzione" : "esecuzioni"
        } · ${formatTokens(
          totals.input_tokens,
        )} token in ingresso, ${formatTokens(totals.output_tokens)} in uscita, ${formatTokens(
          totals.cache_tokens,
        )} letti da cache`,
        hint: "Stima ai prezzi di listino configurati: il dato ufficiale resta quello della console Anthropic.",
      });
    }
  }

  // Email
  const channel = env.resendApiKey ? "Resend" : env.smtpUrl ? "SMTP" : null;
  const local =
    process.env.NODE_ENV !== "production" || /localhost|127\.0\.0\.1/.test(env.appUrl);
  checks.push(
    channel
      ? { name: "Invio email", state: "ok", detail: `${channel} · mittente ${env.mailFrom}` }
      : local
        ? {
            name: "Invio email",
            state: "attenzione",
            detail: "Nessun provider configurato: in locale il link viene mostrato a schermo",
            hint: "Prima di pubblicare imposta SMTP_URL o RESEND_API_KEY.",
          }
        : await (async () => {
            const invites = await queryOne<{ n: number }>(
              "SELECT COUNT(*) as n FROM invites WHERE revoked = 0",
            ).catch(() => null);
            const attivi = invites?.n ?? 0;
            return attivi > 0
              ? {
                  name: "Invio email",
                  state: "attenzione" as const,
                  detail: `Nessun provider configurato: si entra con i ${attivi} link di accesso diretto attivi`,
                  hint: "Con SMTP_URL o RESEND_API_KEY torna disponibile anche il link via email.",
                }
              : {
                  name: "Invio email",
                  state: "errore" as const,
                  detail: "Nessun provider e nessun link di accesso: nessuno può entrare",
                  hint: "Genera un link di accesso diretto da /admin, oppure imposta SMTP_URL o RESEND_API_KEY.",
                };
          })(),
  );

  // Disco
  try {
    const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), env.dataDir);
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
    const probe = path.join(dir, ".scrittura-test");
    await writeFile(probe, "ok");
    await unlink(probe);
    checks.push({
      name: "Archiviazione file",
      state: "ok",
      detail: `Cartella ${env.dataDir} scrivibile: i file originali vengono conservati`,
    });
  } catch {
    checks.push({
      name: "Archiviazione file",
      state: "attenzione",
      detail: "Filesystem non scrivibile (normale su hosting serverless)",
      hint:
        "Il testo dei documenti resta nel database e i PDF senza testo vengono conservati lì: l'analisi funziona comunque.",
    });
  }

  // Accessi
  const allowed = await queryOne<{ n: number }>("SELECT COUNT(*) as n FROM allowlist").catch(
    () => null,
  );
  checks.push(
    (allowed?.n ?? 0) > 0
      ? {
          name: "Allowlist",
          state: "ok",
          detail:
            allowed?.n === 1 ? "1 indirizzo autorizzato" : `${allowed?.n} indirizzi autorizzati`,
        }
      : {
          name: "Allowlist",
          state: "errore",
          detail: "Nessun indirizzo autorizzato: nessuno può entrare",
          hint: "Imposta ADMIN_EMAILS.",
        },
  );

  return checks;
}
