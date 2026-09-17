import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(`${env.appUrl}/login`, { status: 303 });
}
