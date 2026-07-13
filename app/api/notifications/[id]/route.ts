import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/notifications";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("notifications.markRead", error);
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}
