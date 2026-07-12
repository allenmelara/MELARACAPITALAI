import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getNewsFeed } from "@/lib/news";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const feed = await getNewsFeed(user.id);
    return NextResponse.json({ feed });
  } catch (error) {
    logError("news.feed", error);
    return NextResponse.json({ error: "Failed to load news." }, { status: 500 });
  }
}
