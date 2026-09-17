import { env } from "../env";

export type Extraction = {
  text: string;
  status: "ok" | "vuoto" | "errore";
  warning: string | null;
  pages?: number;
};

const TEXT_EXTENSIONS = ["txt", "md", "markdown", "csv", "tsv", "json", "html", "htm"];

export function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupported(filename: string, mime?: string | null): boolean {
  const ext = extensionOf(filename);
  return (
    ["pdf", "docx", "xlsx", "xlsm", "xls", ...TEXT_EXTENSIONS].includes(ext) ||
    (mime ?? "").startsWith("text/")
  );
}

export function maxUploadBytes(): number {
  return env.maxUploadMb * 1024 * 1024;
}

/** Estrae testo dai formati supportati. Non solleva: gli errori diventano stato. */
export async function extractText(
  buffer: Buffer,
  filename: string,
  mime?: string | null,
): Promise<Extraction> {
  const ext = extensionOf(filename);
  try {
    if (ext === "pdf") return await extractPdf(buffer);
    if (ext === "docx") return await extractDocx(buffer);
    if (["xlsx", "xlsm", "xls"].includes(ext)) return await extractSpreadsheet(buffer);
    if (TEXT_EXTENSIONS.includes(ext) || (mime ?? "").startsWith("text/")) {
      const text = buffer.toString("utf8");
      return finalize(text);
    }
    return {
      text: "",
      status: "errore",
      warning: `Formato .${ext} non supportato. Converti il file in PDF, DOCX, XLSX o testo.`,
    };
  } catch (error) {
    return { text: "", status: "errore", warning: `Estrazione non riuscita: ${String(error)}` };
  }
}

async function extractPdf(buffer: Buffer): Promise<Extraction> {
  const { extractText: unpdfExtract, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await unpdfExtract(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  const result = finalize(merged);
  if (result.status === "vuoto") {
    return {
      ...result,
      pages: totalPages,
      warning:
        "Il PDF non contiene testo selezionabile (probabile scansione o deck fatto di immagini). " +
        "Il contenuto visivo resta leggibile da Claude se il file è un PDF di dimensioni contenute; " +
        "per un'analisi più accurata carica anche una versione testuale.",
    };
  }
  return { ...result, pages: totalPages };
}

async function extractDocx(buffer: Buffer): Promise<Extraction> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return finalize(result.value);
}

async function extractSpreadsheet(buffer: Buffer): Promise<Extraction> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) parts.push(`### Foglio: ${sheetName}\n${csv.trim()}`);
  }
  return finalize(parts.join("\n\n"));
}

function finalize(raw: string): Extraction {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (text.length < 40) {
    return { text, status: "vuoto", warning: "Nessun testo estraibile dal file." };
  }
  return { text, status: "ok", warning: null };
}
