import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const notifications = await listNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    logError("notifications.list", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`notifications:mark-all:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  try {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("notifications.markAll", error);
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
  }
}
