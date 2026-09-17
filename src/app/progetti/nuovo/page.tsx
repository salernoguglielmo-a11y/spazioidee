import NewProjectForm from "@/components/NewProjectForm";
import { requirePageUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requirePageUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuovo progetto</h1>
        <p className="muted mt-1 text-sm">
          Bastano nome e una riga di descrizione: il resto può arrivare dai documenti.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
