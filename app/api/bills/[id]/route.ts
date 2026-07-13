import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { deleteBill } from "@/lib/bills";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteBill(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("bills.delete", error);
    return NextResponse.json({ error: "Failed to delete bill." }, { status: 500 });
  }
}
