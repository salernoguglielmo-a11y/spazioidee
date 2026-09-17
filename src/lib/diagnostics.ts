import { headers } from "next/headers";
import { access, constants, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, queryOne } from "./db";
import { apiEnabled, env, manualEnabled } from "./env";

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

  // Email
  const channel = env.resendApiKey ? "Resend" : env.smtpUrl ? "SMTP" : null;
  checks.push(
    channel
      ? { name: "Invio email", state: "ok", detail: `${channel} · mittente ${env.mailFrom}` }
      : {
          name: "Invio email",
          state: "attenzione",
          detail: "Nessun provider configurato: il link di accesso viene mostrato a schermo",
          hint: "Va bene per provare, non per l'uso reale. Imposta SMTP_URL o RESEND_API_KEY.",
        },
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
