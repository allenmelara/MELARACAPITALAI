import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
  notificationPreferencesInputSchema,
  DEFAULT_PREFERENCES
} from "@/lib/notificationPreferences";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const preferences = await getNotificationPreferences();
    return NextResponse.json({ preferences: preferences ?? { ...DEFAULT_PREFERENCES, updatedAt: null } });
  } catch (error) {
    logError("notificationPreferences.get", error);
    return NextResponse.json({ error: "Failed to load preferences." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`notification-preferences:save:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = notificationPreferencesInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid preferences." }, { status: 400 });
  }

  try {
    const preferences = await upsertNotificationPreferences(user.id, parsed.data);
    return NextResponse.json({ preferences });
  } catch (error) {
    logError("notificationPreferences.save", error);
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }
}
