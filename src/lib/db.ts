import { createClient, type Client } from "@libsql/client";
import { env } from "./env";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  email       TEXT PRIMARY KEY,
  name        TEXT,
  created_at  TEXT NOT NULL,
  last_login  TEXT
);

CREATE TABLE IF NOT EXISTS allowlist (
  email       TEXT PRIMARY KEY,
  role        TEXT NOT NULL DEFAULT 'member',
  note        TEXT,
  added_by    TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_tokens (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email);

CREATE TABLE IF NOT EXISTS projects (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  one_liner      TEXT,
  sector         TEXT,
  stage          TEXT,
  geography      TEXT,
  business_model TEXT,
  goal           TEXT,
  modules        TEXT NOT NULL DEFAULT '[]',
  owner_email    TEXT NOT NULL,
  archived       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_email);

CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime         TEXT,
  size         INTEGER NOT NULL DEFAULT 0,
  kind         TEXT NOT NULL DEFAULT 'altro',
  storage_path TEXT,
  content      TEXT NOT NULL DEFAULT '',
  raw_b64      TEXT,
  chars        INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'ok',
  warning      TEXT,
  uploaded_by  TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);

CREATE TABLE IF NOT EXISTS analyses (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  module_id      TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'ai',
  ai_markdown    TEXT NOT NULL DEFAULT '',
  human_markdown TEXT,
  score          INTEGER,
  confidence     TEXT,
  summary        TEXT,
  strengths      TEXT NOT NULL DEFAULT '[]',
  risks          TEXT NOT NULL DEFAULT '[]',
  actions        TEXT NOT NULL DEFAULT '[]',
  sources        TEXT NOT NULL DEFAULT '[]',
  model          TEXT,
  run_count      INTEGER NOT NULL DEFAULT 0,
  validated_by   TEXT,
  validated_at   TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (project_id, module_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  module_id   TEXT NOT NULL,
  text        TEXT NOT NULL,
  rationale   TEXT,
  priority    TEXT NOT NULL DEFAULT 'media',
  status      TEXT NOT NULL DEFAULT 'aperta',
  answer      TEXT,
  answered_by TEXT,
  answered_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_project ON questions(project_id);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  module_id   TEXT,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  author      TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);

CREATE TABLE IF NOT EXISTS insights (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  module_id   TEXT,
  source      TEXT NOT NULL DEFAULT 'umano',
  content     TEXT NOT NULL,
  author      TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_insights_project ON insights(project_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor       TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL
);
`;

let client: Client | null = null;
let ready: Promise<void> | null = null;

function rawClient(): Client {
  if (!client) {
    client = createClient({
      url: env.databaseUrl,
      authToken: env.databaseAuthToken,
    });
  }
  return client;
}

/** Colonne aggiunte dopo la prima release: applicate solo se mancanti. */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: "documents", column: "raw_b64", definition: "TEXT" },
];

async function migrate(): Promise<void> {
  const c = rawClient();
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await c.execute(statement);
  }
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const info = await c.execute(`PRAGMA table_info(${table})`);
    const exists = info.rows.some((row) => String(row.name) === column);
    if (!exists) {
      await c.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
  await seedAllowlist(c);
}

/** Gli indirizzi in ALLOWED_EMAILS/ADMIN_EMAILS entrano sempre in allowlist. */
async function seedAllowlist(c: Client): Promise<void> {
  const now = new Date().toISOString();
  for (const email of env.allowedEmails) {
    await c.execute({
      sql: `INSERT INTO allowlist (email, role, note, added_by, created_at)
            VALUES (?, 'member', 'da configurazione', 'system', ?)
            ON CONFLICT(email) DO NOTHING`,
      args: [email, now],
    });
  }
  for (const email of env.adminEmails) {
    await c.execute({
      sql: `INSERT INTO allowlist (email, role, note, added_by, created_at)
            VALUES (?, 'admin', 'da configurazione', 'system', ?)
            ON CONFLICT(email) DO UPDATE SET role = 'admin'`,
      args: [email, now],
    });
  }
}

/** Client pronto all'uso, con schema applicato una sola volta per processo. */
export async function db(): Promise<Client> {
  if (!ready) ready = migrate();
  await ready;
  return rawClient();
}

export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const c = await db();
  const res = await c.execute({ sql, args: args as never });
  return res.rows as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
): Promise<T | null> {
  const rows = await queryAll<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: unknown[] = []): Promise<void> {
  const c = await db();
  await c.execute({ sql, args: args as never });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix = ""): string {
  const id = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix ? `${prefix}_${id}` : id;
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
