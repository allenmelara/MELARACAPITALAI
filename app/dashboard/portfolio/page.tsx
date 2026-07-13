import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPortfolioSummary } from "@/lib/portfolio";
import { getWatchlistWithQuotes } from "@/lib/watchlist";
import PortfolioTracker from "@/components/PortfolioTracker";

export default async function PortfolioPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const [summary, watchlist] = await Promise.all([getPortfolioSummary(user.id), getWatchlistWithQuotes()]);
  return <PortfolioTracker initialSummary={summary} initialWatchlist={watchlist} />;
}
