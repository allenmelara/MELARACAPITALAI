import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPortfolioSummary } from "@/lib/portfolio";
import PortfolioTracker from "@/components/PortfolioTracker";

export default async function PortfolioPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const summary = await getPortfolioSummary(user.id);
  return <PortfolioTracker initialSummary={summary} />;
}
