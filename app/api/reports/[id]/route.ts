import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { renameReport, deleteReport } from "@/lib/reports";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const renameSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid title." }, { status: 400 });
  }

  try {
    await renameReport(id, parsed.data.title);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("reports.rename", error);
    return NextResponse.json({ error: "Failed to rename report." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteReport(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("reports.delete", error);
    return NextResponse.json({ error: "Failed to delete report." }, { status: 500 });
  }
}
