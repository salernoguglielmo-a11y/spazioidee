import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createProject, listProjects } from "@/lib/data/projects";
import { errorResponse } from "@/lib/api";
import { audit } from "@/lib/auth/allowlist";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ projects: await listProjects(user) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Il nome del progetto è obbligatorio." }, { status: 400 });
    }
    const project = await createProject(
      {
        name,
        one_liner: body.one_liner,
        sector: body.sector,
        stage: body.stage,
        geography: body.geography,
        business_model: body.business_model,
        goal: body.goal,
        modules: Array.isArray(body.modules) ? body.modules : undefined,
      },
      user,
    );
    await audit(user.email, "project.create", project.id, project.name);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}
