import { notFound } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import ManualDialogue from "@/components/ManualDialogue";
import { apiEnabled } from "@/lib/env";
import { requirePageUser } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { listMessages } from "@/lib/data/analyses";

export const dynamic = "force-dynamic";

export default async function DialoguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const project = await getProject(id, user);
  if (!project) notFound();

  const messages = await listMessages(id);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Dialogo sul progetto</h2>
        <p className="muted mt-1 text-sm">
          Il confronto libero: chiedi chiarimenti, contesta una valutazione, porta informazioni
          nuove. Tutto quello che emerge qui resta nel contesto del progetto.
        </p>
      </div>
      {apiEnabled() ? (
        <ChatPanel projectId={id} initialMessages={messages} />
      ) : (
        <ManualDialogue projectId={id} />
      )}
    </div>
  );
}
