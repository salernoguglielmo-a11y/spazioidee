export type Project = {
  id: string;
  name: string;
  one_liner: string | null;
  sector: string | null;
  stage: string | null;
  geography: string | null;
  business_model: string | null;
  goal: string | null;
  modules: string[];
  owner_email: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentRecord = {
  id: string;
  project_id: string;
  filename: string;
  mime: string | null;
  size: number;
  kind: string;
  storage_path: string | null;
  content: string;
  /** PDF senza testo estraibile, conservato per l'invio nativo al modello. */
  raw_b64: string | null;
  chars: number;
  status: "ok" | "vuoto" | "errore";
  warning: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type AnalysisStatus = "ai" | "in_revisione" | "validata";

export type Analysis = {
  id: string;
  project_id: string;
  module_id: string;
  status: AnalysisStatus;
  ai_markdown: string;
  human_markdown: string | null;
  score: number | null;
  confidence: string | null;
  summary: string | null;
  strengths: string[];
  risks: string[];
  actions: string[];
  sources: { title: string; url: string }[];
  model: string | null;
  run_count: number;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  project_id: string;
  module_id: string;
  text: string;
  rationale: string | null;
  priority: "alta" | "media" | "bassa";
  status: "aperta" | "risposta" | "archiviata";
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  project_id: string;
  module_id: string | null;
  role: "user" | "assistant";
  content: string;
  author: string | null;
  created_at: string;
};

export type Insight = {
  id: string;
  project_id: string;
  module_id: string | null;
  source: string;
  content: string;
  author: string | null;
  created_at: string;
};

export const STAGES = [
  "Idea",
  "Prototipo",
  "MVP",
  "Primi clienti",
  "Ricavi ricorrenti",
  "Scale-up",
] as const;

export const DOC_KINDS = [
  "business plan",
  "pitch deck",
  "piano finanziario",
  "ricerca di mercato",
  "documento tecnico",
  "contratto",
  "altro",
] as const;
