import { NextResponse } from "next/server";
import { errorResponse, NotFoundError, notFoundResponse, requireProject } from "@/lib/api";
import { extractText, isSupported, maxUploadBytes } from "@/lib/documents/extract";
import { storeFile } from "@/lib/documents/storage";
import { insertDocument, listDocuments } from "@/lib/data/documents";
import { touchProject } from "@/lib/data/projects";
import { newId } from "@/lib/db";
import { audit } from "@/lib/auth/allowlist";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireProject(id);
    const documents = await listDocuments(id);
    return NextResponse.json({
      documents: documents.map((d) => ({ ...d, content: undefined, preview: d.content.slice(0, 400) })),
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user } = await requireProject(id);

    const form = await request.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File);
    const kind = String(form.get("kind") ?? "altro");

    if (!files.length) {
      return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
    }

    const results: { filename: string; status: string; warning: string | null }[] = [];

    for (const file of files) {
      if (file.size > maxUploadBytes()) {
        results.push({
          filename: file.name,
          status: "errore",
          warning: `File troppo grande (max ${env.maxUploadMb} MB).`,
        });
        continue;
      }
      if (!isSupported(file.name, file.type)) {
        results.push({
          filename: file.name,
          status: "errore",
          warning: "Formato non supportato. Usa PDF, DOCX, XLSX, CSV, TXT o MD.",
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const extraction = await extractText(buffer, file.name, file.type);
      const documentId = newId("doc");
      let storagePath: string | null = null;
      try {
        storagePath = await storeFile(id, documentId, file.name, buffer);
      } catch (error) {
        // Filesystem non scrivibile (deploy serverless): non è un errore fatale.
        console.warn("Archiviazione su disco non disponibile:", error);
      }

      // Un PDF senza testo estraibile serve a Claude come immagine: se il disco
      // non è persistente lo conserviamo nel database, entro il limite previsto.
      const isVisualPdf =
        env.nativePdf &&
        extraction.status !== "ok" &&
        file.name.toLowerCase().endsWith(".pdf") &&
        file.size <= env.nativePdfMaxMb * 1024 * 1024;
      const rawB64 = isVisualPdf ? buffer.toString("base64") : null;

      await insertDocument({
        project_id: id,
        filename: file.name,
        mime: file.type || null,
        size: file.size,
        kind,
        storage_path: storagePath,
        content: extraction.text,
        raw_b64: rawB64,
        chars: extraction.text.length,
        status: extraction.status,
        warning: extraction.warning,
        uploaded_by: user.email,
      });

      results.push({
        filename: file.name,
        status: extraction.status,
        warning: extraction.warning,
      });
    }

    await touchProject(id);
    await audit(user.email, "document.upload", id, results.map((r) => r.filename).join(", "));
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof NotFoundError) return notFoundResponse();
    return errorResponse(error);
  }
}
