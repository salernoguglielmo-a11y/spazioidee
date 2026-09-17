/**
 * Configurazione centralizzata. Tutte le variabili sono opzionali in sviluppo:
 * l'app parte comunque e segnala in UI cosa manca.
 */

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  appName: process.env.APP_NAME ?? "Spazio Idee",
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),

  // Persistenza: file locale oppure URL libsql/Turso.
  databaseUrl: process.env.DATABASE_URL ?? "file:./data/spazioidee.db",
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
  dataDir: process.env.DATA_DIR ?? "./data",

  // Sicurezza
  authSecret: process.env.AUTH_SECRET ?? "",
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),

  // Controllo accessi
  allowedEmails: list(process.env.ALLOWED_EMAILS),
  adminEmails: list(process.env.ADMIN_EMAILS),
  /** "shared": i progetti sono visibili a tutti gli autorizzati. "private": solo a chi li crea (e agli admin). */
  projectVisibility: (process.env.PROJECT_VISIBILITY ?? "shared") as "shared" | "private",

  // Claude
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
  effort: (process.env.ANTHROPIC_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max",
  enableWebSearch: (process.env.ENABLE_WEB_SEARCH ?? "true") !== "false",
  webSearchMaxUses: Number(process.env.WEB_SEARCH_MAX_USES ?? 8),

  // Documenti
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 25),
  contextCharBudget: Number(process.env.CONTEXT_CHAR_BUDGET ?? 500_000),
  nativePdf: (process.env.NATIVE_PDF ?? "true") !== "false",
  nativePdfMaxMb: Number(process.env.NATIVE_PDF_MAX_MB ?? 8),
  nativePdfMaxDocs: Number(process.env.NATIVE_PDF_MAX_DOCS ?? 4),

  // Email (magic link)
  mailFrom: process.env.MAIL_FROM ?? "Spazio Idee <no-reply@localhost>",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  smtpUrl: process.env.SMTP_URL ?? "",
};

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!env.authSecret) missing.push("AUTH_SECRET");
  if (!env.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (env.allowedEmails.length === 0 && env.adminEmails.length === 0) missing.push("ALLOWED_EMAILS");
  if (!env.resendApiKey && !env.smtpUrl) missing.push("RESEND_API_KEY oppure SMTP_URL");
  return missing;
}
