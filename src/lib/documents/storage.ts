import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env";

function uploadsRoot(): string {
  return path.resolve(process.cwd(), env.dataDir, "uploads");
}

function safeName(filename: string): string {
  return filename.replace(/[^\w.\-]+/g, "_").slice(-120);
}

/** Salva il file originale e restituisce il percorso relativo alla cartella dati. */
export async function storeFile(
  projectId: string,
  documentId: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const dir = path.join(uploadsRoot(), projectId);
  await mkdir(dir, { recursive: true });
  const relative = path.join("uploads", projectId, `${documentId}-${safeName(filename)}`);
  await writeFile(path.resolve(/* turbopackIgnore: true */ process.cwd(), env.dataDir, relative), buffer);
  return relative;
}

export async function readStoredFile(relativePath: string): Promise<Buffer | null> {
  try {
    return await readFile(path.resolve(/* turbopackIgnore: true */ process.cwd(), env.dataDir, relativePath));
  } catch {
    return null;
  }
}

export async function removeStoredFile(relativePath: string | null): Promise<void> {
  if (!relativePath) return;
  try {
    await unlink(path.resolve(/* turbopackIgnore: true */ process.cwd(), env.dataDir, relativePath));
  } catch {
    // il file può già essere stato rimosso: non è un errore bloccante
  }
}
