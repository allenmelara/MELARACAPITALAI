import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getNewsFeed } from "@/lib/news";
import NewsFeed from "@/components/NewsFeed";

export default async function NewsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const feed = await getNewsFeed(user.id);
  return <NewsFeed initialFeed={feed} />;
}
